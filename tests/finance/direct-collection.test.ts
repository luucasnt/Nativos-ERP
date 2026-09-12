// Integração real (Postgres): confirmação de recebimento direto (spec
// seção 6 — DirectCollection). Ao contrário dos outros testes de
// integração deste projeto, aqui NADA pode ser limpo no teardown: uma vez
// que um DirectCollection existe, o trigger de DELETE bloqueado (Fase 1)
// impede apagá-lo, e sua FK para `services` é ON DELETE RESTRICT (não
// SET NULL como em finance_entries) — então o Service, a Reservation e o
// Client associados também ficam permanentemente presos. Isso não é um
// descuido: é exatamente a garantia de integridade que este teste
// verifica (nunca se pode apagar o rastro de um recebimento direto), e
// por isso os testes aqui são propositalmente poucos.
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  confirmDirectCollectionNotReceived,
  confirmDirectCollectionReceived,
} from "@/lib/finance/direct-collection";
import { generateServiceFinanceEntries } from "@/lib/finance/settlement";

const prisma = new PrismaClient();

afterAll(async () => {
  await prisma.$disconnect();
});

async function seedDirectServiceFixture(overrides: {
  execution_type: "propria" | "fornecedor";
  supplier_id?: string;
  driver_id?: string;
}) {
  const client = await prisma.client.create({
    data: { name: `Cliente Direto ${Date.now()}`, origin: "proprio" },
  });
  const reservation = await prisma.reservation.create({
    data: {
      code: `DIRETO-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      client_id: client.id,
      collection_mode: "direto",
    },
  });
  const service = await prisma.service.create({
    data: {
      reservation_id: reservation.id,
      type: "transfer_chegada",
      execution_type: overrides.execution_type,
      supplier_id: overrides.supplier_id,
      driver_id: overrides.driver_id,
      collection_actor: overrides.execution_type === "propria" ? "motorista_proprio" : "fornecedor",
      supplier_cost: overrides.execution_type === "fornecedor" ? 300 : undefined,
      original_price: 1000,
      price: 1000,
      acceptance_status: "aceito",
      execution_status: "concluido",
    },
  });
  await generateServiceFinanceEntries(service.id);

  return { client, reservation, service };
}

describe("confirmação de recebimento direto (irreversível por design)", () => {
  it("motorista_proprio: 'recebi o valor' cria DirectCollection com financial_responsible=driver", async () => {
    const driver = await prisma.driver.create({
      data: { name: `Motorista Direto ${Date.now()}`, owner_type: "proprio", payment_type: "diaria" },
    });
    const { service } = await seedDirectServiceFixture({ execution_type: "propria", driver_id: driver.id });

    const collection = await confirmDirectCollectionReceived(service.id);

    expect(collection.receiver_type).toBe("motorista_proprio");
    expect(collection.financial_responsible_type).toBe("driver");
    expect(collection.financial_responsible_id).toBe(driver.id);
    expect(collection.status).toBe("received");
    expect(collection.amount.toString()).toBe("1000");

    // Idempotente: confirmar de novo devolve o mesmo registro.
    const again = await confirmDirectCollectionReceived(service.id);
    expect(again.id).toBe(collection.id);
  });

  it("fornecedor: 'não recebi' cria DirectCollection com financial_responsible=company e o motivo", async () => {
    const supplier = await prisma.company.create({
      data: { name: `Fornecedor Direto ${Date.now()}`, roles: ["fornecedor"], recebe_pagamento_direto: true },
    });
    const { service } = await seedDirectServiceFixture({ execution_type: "fornecedor", supplier_id: supplier.id });
    const reason = await prisma.catalogItem.findFirstOrThrow({ where: { type: "motivo_perda" } });

    const collection = await confirmDirectCollectionNotReceived(service.id, reason.id);

    expect(collection.receiver_type).toBe("fornecedor");
    expect(collection.financial_responsible_type).toBe("company");
    expect(collection.financial_responsible_id).toBe(supplier.id);
    expect(collection.status).toBe("not_received");
    expect(collection.not_received_reason_id).toBe(reason.id);
  });

  it("DELETE físico continua bloqueado mesmo para um DirectCollection criado pelo fluxo do portal", async () => {
    const driver = await prisma.driver.create({
      data: { name: `Motorista Direto Delete ${Date.now()}`, owner_type: "proprio", payment_type: "diaria" },
    });
    const { service } = await seedDirectServiceFixture({ execution_type: "propria", driver_id: driver.id });

    const collection = await confirmDirectCollectionReceived(service.id);

    await expect(prisma.directCollection.delete({ where: { id: collection.id } })).rejects.toThrow();
  });
});
