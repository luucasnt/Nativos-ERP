// Testes de integração contra Postgres real: o ciclo de vida completo do
// razão financeiro — aceite gera o lançamento "programado", conclusão do
// serviço libera payment_eligible, cancelamento cancela (nunca apaga), e
// as duas regras não-negociáveis (spec seção 6) seguem valendo mesmo
// quando disparadas pelo motor, não só por SQL cru.
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { acceptService, rejectService } from "@/lib/reservations/acceptance";
import {
  generateServiceFinanceEntries,
  markServiceFinanceEntriesEligible,
  cancelServiceFinanceEntries,
} from "@/lib/finance/settlement";
import { createPayment, reverseFinanceEntry } from "@/lib/finance/ledger";

const prisma = new PrismaClient();

afterAll(async () => {
  await prisma.$disconnect();
});

async function seedReservationWithService(overrides: {
  execution_type?: "propria" | "fornecedor";
  collection_mode?: "nativos" | "direto" | "faturado";
  supplier_id?: string;
  supplier_cost?: number;
  driver_id?: string;
}) {
  const client = await prisma.client.create({
    data: { name: `Cliente Lifecycle ${Date.now()}`, origin: "proprio" },
  });
  const reservation = await prisma.reservation.create({
    data: {
      code: `LIFE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      client_id: client.id,
      collection_mode: overrides.collection_mode ?? "nativos",
    },
  });
  const service = await prisma.service.create({
    data: {
      reservation_id: reservation.id,
      type: "transfer_chegada",
      execution_type: overrides.execution_type ?? "propria",
      supplier_id: overrides.supplier_id,
      supplier_cost: overrides.supplier_cost,
      driver_id: overrides.driver_id,
      original_price: 1000,
      price: 1000,
      // Serviços de fornecedor nascem aguardando_aceite; o teste chama
      // acceptService explicitamente quando precisa desse marco.
      acceptance_status: overrides.execution_type === "fornecedor" ? "aguardando_aceite" : "aceito",
    },
  });

  return { client, reservation, service };
}

// Client/Reservation/Service podem ser removidos normalmente ao final do
// teste (nenhum trigger os protege). FinanceEntry/Payment/Compensation
// gerados no processo NÃO são removidos aqui — não por descuido, mas
// porque é fisicamente impossível: é exatamente essa garantia que estes
// testes verificam. Cada teste usa um `code`/e-mail com timestamp único,
// então as linhas remanescentes nunca colidem com outra execução; ao
// deletar a Reservation/Service, o FK dessas linhas para reservation_id/
// service_id vira null (ON DELETE SET NULL) em vez de bloquear a limpeza.
async function cleanup(ids: { clientId: string; reservationId: string; serviceId: string }) {
  await prisma.service.delete({ where: { id: ids.serviceId } }).catch(() => {});
  await prisma.reservation.delete({ where: { id: ids.reservationId } }).catch(() => {});
  await prisma.client.delete({ where: { id: ids.clientId } }).catch(() => {});
}

describe("ciclo de vida: aceite -> conclusão -> elegibilidade", () => {
  it("gera lançamento programado (não elegível) só depois do aceite", async () => {
    const { client, reservation, service } = await seedReservationWithService({
      execution_type: "fornecedor",
    });

    try {
      const beforeAccept = await prisma.financeEntry.findMany({ where: { service_id: service.id } });
      expect(beforeAccept).toHaveLength(0);

      await acceptService(service.id);

      const afterAccept = await prisma.financeEntry.findMany({ where: { service_id: service.id } });
      expect(afterAccept).toHaveLength(1);
      expect(afterAccept[0].status).toBe("programado");
      expect(afterAccept[0].payment_eligible).toBe(false);
    } finally {
      await cleanup({ clientId: client.id, reservationId: reservation.id, serviceId: service.id });
    }
  });

  it("regra não-negociável: payment_eligible só vira true depois que markServiceFinanceEntriesEligible roda (marco = serviço concluído)", async () => {
    const { client, reservation, service } = await seedReservationWithService({});

    try {
      await generateServiceFinanceEntries(service.id);

      const programado = await prisma.financeEntry.findMany({ where: { service_id: service.id } });
      expect(programado.every((e) => e.payment_eligible === false)).toBe(true);
      expect(programado.every((e) => e.status === "programado")).toBe(true);

      // Simula o marco operacional sendo atingido.
      await markServiceFinanceEntriesEligible(service.id);

      const eligible = await prisma.financeEntry.findMany({ where: { service_id: service.id } });
      expect(eligible.every((e) => e.payment_eligible === true)).toBe(true);
      expect(eligible.every((e) => e.status === "pendente")).toBe(true);
    } finally {
      await cleanup({ clientId: client.id, reservationId: reservation.id, serviceId: service.id });
    }
  });

  it("cancelar um serviço cancela (nunca apaga) seus lançamentos não pagos", async () => {
    const { client, reservation, service } = await seedReservationWithService({});

    try {
      await generateServiceFinanceEntries(service.id);
      const [entry] = await prisma.financeEntry.findMany({ where: { service_id: service.id } });

      await cancelServiceFinanceEntries(service.id);

      const afterCancel = await prisma.financeEntry.findUniqueOrThrow({ where: { id: entry.id } });
      expect(afterCancel.status).toBe("cancelado");
      // Continua existindo — não foi apagado.
      expect(afterCancel.id).toBe(entry.id);
    } finally {
      await cleanup({ clientId: client.id, reservationId: reservation.id, serviceId: service.id });
    }
  });

  it("recusa do fornecedor não gera nenhum lançamento", async () => {
    const { client, reservation, service } = await seedReservationWithService({
      execution_type: "fornecedor",
    });

    try {
      await rejectService(service.id, "Sem disponibilidade");

      const entries = await prisma.financeEntry.findMany({ where: { service_id: service.id } });
      expect(entries).toHaveLength(0);
    } finally {
      await cleanup({ clientId: client.id, reservationId: reservation.id, serviceId: service.id });
    }
  });

  it("idempotência: gerar de novo com o mesmo serviço não duplica, só ajusta o rascunho", async () => {
    const { client, reservation, service } = await seedReservationWithService({});

    try {
      await generateServiceFinanceEntries(service.id);
      const first = await prisma.financeEntry.findMany({ where: { service_id: service.id } });
      expect(first).toHaveLength(1);

      // Preço muda (ex.: desconto aplicado depois) — recalcular deve
      // ajustar o valor do mesmo lançamento, não criar um segundo.
      await prisma.service.update({ where: { id: service.id }, data: { price: 850 } });
      await generateServiceFinanceEntries(service.id);

      const second = await prisma.financeEntry.findMany({ where: { service_id: service.id } });
      expect(second).toHaveLength(1);
      expect(second[0].id).toBe(first[0].id);
      expect(second[0].amount.toString()).toBe("850");
    } finally {
      await cleanup({ clientId: client.id, reservationId: reservation.id, serviceId: service.id });
    }
  });

  it("uma vez elegível/pago, recalcular não sobrescreve silenciosamente o valor já travado", async () => {
    const { client, reservation, service } = await seedReservationWithService({});

    try {
      await generateServiceFinanceEntries(service.id);
      await markServiceFinanceEntriesEligible(service.id);
      const [eligible] = await prisma.financeEntry.findMany({ where: { service_id: service.id } });
      expect(eligible.amount.toString()).toBe("1000");

      await prisma.service.update({ where: { id: service.id }, data: { price: 1 } });
      await generateServiceFinanceEntries(service.id);

      const stillSame = await prisma.financeEntry.findUniqueOrThrow({ where: { id: eligible.id } });
      expect(stillSame.amount.toString()).toBe("1000");
    } finally {
      await cleanup({ clientId: client.id, reservationId: reservation.id, serviceId: service.id });
    }
  });
});

describe("regras não-negociáveis (spec seção 6) via motor, não só via SQL cru", () => {
  it("DELETE físico continua bloqueado mesmo para um lançamento criado pelo motor", async () => {
    const { client, reservation, service } = await seedReservationWithService({});

    try {
      await generateServiceFinanceEntries(service.id);
      const [entry] = await prisma.financeEntry.findMany({ where: { service_id: service.id } });

      await expect(prisma.financeEntry.delete({ where: { id: entry.id } })).rejects.toThrow();

      const stillThere = await prisma.financeEntry.findUnique({ where: { id: entry.id } });
      expect(stillThere).not.toBeNull();
    } finally {
      await cleanup({ clientId: client.id, reservationId: reservation.id, serviceId: service.id });
    }
  });

  it("reverseFinanceEntry nunca apaga o original — cria um estorno e marca o original como revertido", async () => {
    const { client, reservation, service } = await seedReservationWithService({});

    try {
      await generateServiceFinanceEntries(service.id);
      await markServiceFinanceEntriesEligible(service.id);
      const [entry] = await prisma.financeEntry.findMany({ where: { service_id: service.id } });

      const actor = await prisma.user.create({
        data: {
          auth_user_id: crypto.randomUUID(),
          email: `estorno-${Date.now()}@example.test`,
          account_type: "internal",
          internal_role: "financeiro",
        },
      });

      try {
        const reversal = await reverseFinanceEntry(entry.id, {
          actorId: actor.id,
          reason: "Serviço não realizado",
          autoKey: `test-estorno-${entry.id}`,
        });

        const original = await prisma.financeEntry.findUniqueOrThrow({ where: { id: entry.id } });
        expect(original.reversed_at).not.toBeNull();
        expect(original.status).toBe("cancelado");
        expect(reversal.estorno_of_id).toBe(entry.id);
        expect(reversal.type).toBe(entry.type === "receita" ? "despesa" : "receita");
        expect(reversal.amount.toString()).toBe(entry.amount.toString());

        // Chamar de novo com a mesma autoKey não duplica o estorno.
        const secondCall = await reverseFinanceEntry(entry.id, {
          actorId: actor.id,
          reason: "Serviço não realizado",
          autoKey: `test-estorno-${entry.id}`,
        });
        expect(secondCall.id).toBe(reversal.id);
      } finally {
        await prisma.user.delete({ where: { id: actor.id } }).catch(() => {});
      }
    } finally {
      await cleanup({ clientId: client.id, reservationId: reservation.id, serviceId: service.id });
    }
  });

  it("createPayment é idempotente por dedupe_key e marca o lançamento como pago", async () => {
    const { client, reservation, service } = await seedReservationWithService({});

    try {
      await generateServiceFinanceEntries(service.id);
      await markServiceFinanceEntriesEligible(service.id);
      const [entry] = await prisma.financeEntry.findMany({ where: { service_id: service.id } });

      const dedupeKey = `test-payment-${entry.id}`;
      const first = await createPayment({
        finance_entry_id: entry.id,
        type: "recebimento",
        amount: entry.amount,
        payment_method: "pix",
        dedupe_key: dedupeKey,
      });
      const second = await createPayment({
        finance_entry_id: entry.id,
        type: "recebimento",
        amount: entry.amount,
        payment_method: "pix",
        dedupe_key: dedupeKey,
      });

      expect(second.id).toBe(first.id);

      const allPayments = await prisma.payment.findMany({ where: { finance_entry_id: entry.id } });
      expect(allPayments).toHaveLength(1);

      const updatedEntry = await prisma.financeEntry.findUniqueOrThrow({ where: { id: entry.id } });
      expect(updatedEntry.status).toBe("pago");
    } finally {
      await cleanup({ clientId: client.id, reservationId: reservation.id, serviceId: service.id });
    }
  });
});
