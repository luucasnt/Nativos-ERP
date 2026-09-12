// Testes de regressão para as garantias de banco da Fase 1 (spec seção 6):
// nenhuma automação ou usuário — nem via SQL direto, nem via Prisma —
// consegue fazer DELETE físico em finance_entries / payments /
// compensations / direct_collections, e audit_logs é append-only (nem
// UPDATE nem DELETE). Cada teste roda dentro de uma transação interativa
// que sempre falha (a própria tentativa bloqueada lança) e portanto nunca
// deixa resíduo no banco, independentemente do resultado.
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

afterAll(async () => {
  await prisma.$disconnect();
});

describe("regra não-negociável: DELETE físico bloqueado por trigger de banco", () => {
  it("bloqueia DELETE em finance_entries", async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        const entry = await tx.financeEntry.create({
          data: {
            type: "receita",
            category: "venda_servico",
            status: "pendente",
            payment_eligible: true,
            amount: 100,
            party_type: "cliente",
            origin_type: "manual",
          },
        });
        await tx.financeEntry.delete({ where: { id: entry.id } });
      }),
    ).rejects.toThrow(/DELETE físico não é permitido/);
  });

  it("bloqueia DELETE em payments", async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        const entry = await tx.financeEntry.create({
          data: {
            type: "despesa",
            category: "pagamento_fornecedor",
            status: "pago",
            payment_eligible: true,
            amount: 200,
            party_type: "fornecedor",
            origin_type: "manual",
          },
        });
        const payment = await tx.payment.create({
          data: {
            finance_entry_id: entry.id,
            type: "pagamento",
            amount: 200,
            payment_method: "pix",
          },
        });
        await tx.payment.delete({ where: { id: payment.id } });
      }),
    ).rejects.toThrow(/DELETE físico não é permitido/);
  });

  it("bloqueia DELETE em direct_collections", async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        const client = await tx.client.create({
          data: { name: "Cliente Teste Vitest", origin: "proprio" },
        });
        const reservation = await tx.reservation.create({
          data: { code: `TEST-${Date.now()}`, client_id: client.id },
        });
        const service = await tx.service.create({
          data: {
            reservation_id: reservation.id,
            type: "transfer_chegada",
            execution_type: "propria",
            original_price: 100,
            price: 100,
          },
        });
        const collection = await tx.directCollection.create({
          data: {
            service_id: service.id,
            receiver_type: "motorista_proprio",
            receiver_id: client.id, // id qualquer válido só para satisfazer o tipo uuid neste teste de integridade de DELETE
            financial_responsible_type: "driver",
            financial_responsible_id: client.id,
            amount: 100,
            idempotency_key: `test-${Date.now()}`,
          },
        });
        await tx.directCollection.delete({ where: { id: collection.id } });
      }),
    ).rejects.toThrow(/DELETE físico não é permitido/);
  });

  it("bloqueia DELETE em compensations", async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        const compensation = await tx.compensation.create({
          data: {
            counterparty_type: "supplier",
            counterparty_id: crypto.randomUUID(),
            payable_allocation: {},
            receivable_allocation: {},
            amount: 50,
            idempotency_key: `test-comp-${Date.now()}`,
          },
        });
        await tx.compensation.delete({ where: { id: compensation.id } });
      }),
    ).rejects.toThrow(/DELETE físico não é permitido/);
  });
});

describe("regra não-negociável: audit_logs é append-only", () => {
  it("bloqueia UPDATE em audit_logs", async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        const log = await tx.auditLog.create({
          data: { action: "test_action", entity_type: "other" },
        });
        await tx.auditLog.update({
          where: { id: log.id },
          data: { action: "tampered" },
        });
      }),
    ).rejects.toThrow(/append-only/);
  });

  it("bloqueia DELETE em audit_logs", async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        const log = await tx.auditLog.create({
          data: { action: "test_action", entity_type: "other" },
        });
        await tx.auditLog.delete({ where: { id: log.id } });
      }),
    ).rejects.toThrow(/append-only/);
  });
});

describe("regra não-negociável: campos de idempotência têm constraint UNIQUE no banco", () => {
  it("rejeita auto_key duplicado em finance_entries", async () => {
    const auto_key = `unique-test-${Date.now()}`;

    await expect(
      prisma.$transaction(async (tx) => {
        await tx.financeEntry.create({
          data: {
            type: "receita",
            category: "venda_servico",
            status: "pendente",
            payment_eligible: false,
            amount: 10,
            party_type: "cliente",
            origin_type: "manual",
            auto_key,
          },
        });
        // Segunda tentativa com a mesma auto_key deve violar a constraint
        // UNIQUE do banco, não apenas uma checagem de aplicação.
        await tx.financeEntry.create({
          data: {
            type: "receita",
            category: "venda_servico",
            status: "pendente",
            payment_eligible: false,
            amount: 10,
            party_type: "cliente",
            origin_type: "manual",
            auto_key,
          },
        });
      }),
    ).rejects.toThrow();
  });
});
