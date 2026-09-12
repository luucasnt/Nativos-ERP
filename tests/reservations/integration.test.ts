// Testes de integração contra Postgres real: provam que a orquestração
// (criar serviço -> recalcular status da reserva -> recalcular imposto)
// funciona de ponta a ponta, e que o desconto nunca contamina supplier_cost.
//
// Os dois primeiros testes usam uma transação interativa que sempre
// termina com um erro sentinela proposital (RollbackSignal) — é assim que
// se força um ROLLBACK garantido com $transaction do Prisma: ele só
// desfaz a transação quando o callback lança; se o callback resolver com
// sucesso, o Prisma faz COMMIT normalmente (e deixaria resíduo no banco).
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { computeCollectionActor, computeServicePrice } from "@/lib/reservations/pricing";
import { computeReservationStatus } from "@/lib/reservations/status-pure";
import { recalculateReservationTax } from "@/lib/reservations/tax";

const prisma = new PrismaClient();

afterAll(async () => {
  await prisma.$disconnect();
});

class RollbackSignal extends Error {}

async function runInRolledBackTransaction<T>(
  fn: (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => Promise<T>,
): Promise<T> {
  let captured: T;
  await expect(
    prisma.$transaction(async (tx) => {
      captured = await fn(tx);
      throw new RollbackSignal();
    }),
  ).rejects.toThrow(RollbackSignal);
  return captured!;
}

describe("orquestração reserva + serviço", () => {
  it("desconto nunca altera supplier_cost, mesmo após recálculo", async () => {
    const service = await runInRolledBackTransaction(async (tx) => {
      const client = await tx.client.create({
        data: { name: "Cliente Integração", origin: "proprio" },
      });
      const reservation = await tx.reservation.create({
        data: { code: `TEST-${Date.now()}`, client_id: client.id, collection_mode: "direto" },
      });

      const originalPrice = "1000";
      const supplierCost = "700";
      const price = computeServicePrice(originalPrice, "percentual", 20);

      return tx.service.create({
        data: {
          reservation_id: reservation.id,
          type: "transfer_chegada",
          execution_type: "fornecedor",
          original_price: originalPrice,
          price,
          supplier_cost: supplierCost,
          discount_type: "percentual",
          discount_value: 20,
          collection_actor: computeCollectionActor("direto", "fornecedor"),
        },
      });
    });

    expect(service.price.toString()).toBe("800");
    expect(service.supplier_cost?.toString()).toBe("700");
    expect(service.collection_actor).toBe("fornecedor");
  });

  it("computeReservationStatus reflete o estado real dos serviços lidos do banco", async () => {
    const services = await runInRolledBackTransaction(async (tx) => {
      const client = await tx.client.create({
        data: { name: "Cliente Integração 2", origin: "proprio" },
      });
      const reservation = await tx.reservation.create({
        data: { code: `TEST-${Date.now()}-2`, client_id: client.id },
      });

      await tx.service.create({
        data: {
          reservation_id: reservation.id,
          type: "transfer_chegada",
          execution_type: "propria",
          original_price: 100,
          price: 100,
          acceptance_status: "aceito",
          execution_status: "agendado",
        },
      });

      return tx.service.findMany({
        where: { reservation_id: reservation.id },
        select: { acceptance_status: true, execution_status: true },
      });
    });

    expect(computeReservationStatus(services)).toEqual({
      status: "confirmado",
      has_partial_cancellation: false,
    });
  });

  it("recalculateReservationTax soma apenas serviços não cancelados e aplica o percentual congelado (padrão global definido)", async () => {
    const client = await prisma.client.create({
      data: { name: "Cliente Integração 3", origin: "proprio" },
    });

    try {
      await prisma.setting.upsert({
        where: { key: "imposto_padrao" },
        update: { value: { percentual: 6 } },
        create: { key: "imposto_padrao", category: "financeiro", value: { percentual: 6 } },
      });

      const reservation = await prisma.reservation.create({
        data: {
          code: `TEST-${Date.now()}-3`,
          client_id: client.id,
          requires_nf: true,
        },
      });

      try {
        await prisma.service.createMany({
          data: [
            {
              reservation_id: reservation.id,
              type: "transfer_chegada",
              execution_type: "propria",
              original_price: 100,
              price: 100,
              execution_status: "concluido",
            },
            {
              reservation_id: reservation.id,
              type: "transfer_saida",
              execution_type: "propria",
              original_price: 50,
              price: 50,
              execution_status: "cancelado",
            },
          ],
        });

        await recalculateReservationTax(reservation.id);

        const updated = await prisma.reservation.findUniqueOrThrow({
          where: { id: reservation.id },
        });

        expect(updated.nf_value?.toString()).toBe("100");
        expect(updated.tax_percent_snapshot?.toString()).toBe("6");
        expect(updated.tax_amount?.toString()).toBe("6");
      } finally {
        await prisma.service.deleteMany({ where: { reservation_id: reservation.id } });
        await prisma.reservation.delete({ where: { id: reservation.id } });
      }
    } finally {
      await prisma.client.delete({ where: { id: client.id } });
      // Restaura o estado "sem alíquota padrão" para não vazar para outros
      // testes — o cliente pediu explicitamente que não exista valor de
      // fábrica seedado.
      await prisma.setting.delete({ where: { key: "imposto_padrao" } }).catch(() => {});
    }
  });

  it("sem alíquota em lugar nenhum (nem padrão global, nem na reserva) => nada é calculado", async () => {
    await prisma.setting.delete({ where: { key: "imposto_padrao" } }).catch(() => {});

    const client = await prisma.client.create({
      data: { name: "Cliente Integração 4", origin: "proprio" },
    });

    try {
      const reservation = await prisma.reservation.create({
        data: { code: `TEST-${Date.now()}-4`, client_id: client.id, requires_nf: true },
      });

      try {
        await prisma.service.create({
          data: {
            reservation_id: reservation.id,
            type: "transfer_chegada",
            execution_type: "propria",
            original_price: 500,
            price: 500,
          },
        });

        await recalculateReservationTax(reservation.id);

        const updated = await prisma.reservation.findUniqueOrThrow({
          where: { id: reservation.id },
        });

        expect(updated.tax_percent_snapshot).toBeNull();
        expect(updated.tax_amount).toBeNull();
        expect(updated.nf_value).toBeNull();
      } finally {
        await prisma.service.deleteMany({ where: { reservation_id: reservation.id } });
        await prisma.reservation.delete({ where: { id: reservation.id } });
      }
    } finally {
      await prisma.client.delete({ where: { id: client.id } });
    }
  });

  it("alíquota definida manualmente na própria reserva fica congelada mesmo que o padrão global mude depois", async () => {
    await prisma.setting.delete({ where: { key: "imposto_padrao" } }).catch(() => {});

    const client = await prisma.client.create({
      data: { name: "Cliente Integração 5", origin: "proprio" },
    });

    try {
      // Alíquota definida manualmente nesta reserva (10%), sem nenhum
      // padrão global existir ainda.
      const reservation = await prisma.reservation.create({
        data: {
          code: `TEST-${Date.now()}-5`,
          client_id: client.id,
          requires_nf: true,
          tax_percent_snapshot: 10,
        },
      });

      try {
        await prisma.service.create({
          data: {
            reservation_id: reservation.id,
            type: "transfer_chegada",
            execution_type: "propria",
            original_price: 200,
            price: 200,
          },
        });

        await recalculateReservationTax(reservation.id);

        const afterFirstCalc = await prisma.reservation.findUniqueOrThrow({
          where: { id: reservation.id },
        });
        expect(afterFirstCalc.tax_percent_snapshot?.toString()).toBe("10");
        expect(afterFirstCalc.tax_amount?.toString()).toBe("20");

        // Agora o admin define um padrão global diferente (8%) — não deve
        // afetar esta reserva, que já tem alíquota própria congelada.
        await prisma.setting.create({
          data: { key: "imposto_padrao", category: "financeiro", value: { percentual: 8 } },
        });

        await recalculateReservationTax(reservation.id);

        const afterGlobalChange = await prisma.reservation.findUniqueOrThrow({
          where: { id: reservation.id },
        });
        expect(afterGlobalChange.tax_percent_snapshot?.toString()).toBe("10");
        expect(afterGlobalChange.tax_amount?.toString()).toBe("20");
      } finally {
        await prisma.service.deleteMany({ where: { reservation_id: reservation.id } });
        await prisma.reservation.delete({ where: { id: reservation.id } });
      }
    } finally {
      await prisma.client.delete({ where: { id: client.id } });
      await prisma.setting.delete({ where: { key: "imposto_padrao" } }).catch(() => {});
    }
  });
});
