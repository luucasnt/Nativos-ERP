// Integração real (Postgres): ServiceExpense (spec seção 7) — motorista
// registra, admin aprova/rejeita. ServiceExpense não é uma das 4 tabelas
// protegidas (FinanceEntry/Payment/Compensation/DirectCollection), então
// pode ser limpa normalmente no teardown — só o FinanceEntry gerado na
// aprovação fica para trás, pela mesma razão de sempre (DELETE bloqueado).
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { approveServiceExpense, rejectServiceExpense } from "@/lib/finance/expenses";

const prisma = new PrismaClient();

afterAll(async () => {
  await prisma.$disconnect();
});

async function seedFixture() {
  const client = await prisma.client.create({
    data: { name: `Cliente Despesa ${Date.now()}`, origin: "proprio" },
  });
  const reservation = await prisma.reservation.create({
    data: {
      code: `EXP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      client_id: client.id,
      collection_mode: "nativos",
    },
  });
  const driver = await prisma.driver.create({
    data: { name: `Motorista Despesa ${Date.now()}`, owner_type: "proprio", payment_type: "diaria" },
  });
  const service = await prisma.service.create({
    data: {
      reservation_id: reservation.id,
      type: "transfer_chegada",
      execution_type: "propria",
      driver_id: driver.id,
      original_price: 500,
      price: 500,
      acceptance_status: "aceito",
    },
  });
  const category = await prisma.catalogItem.findFirstOrThrow({ where: { type: "categoria_despesa" } });
  const reviewer = await prisma.user.create({
    data: {
      auth_user_id: crypto.randomUUID(),
      email: `revisor-despesa-${Date.now()}@example.test`,
      account_type: "internal",
      internal_role: "financeiro",
    },
  });
  const expense = await prisma.serviceExpense.create({
    data: { service_id: service.id, driver_id: driver.id, category_id: category.id, amount: 80 },
  });

  return { client, reservation, driver, service, expense, reviewer };
}

async function cleanup(ids: { clientId: string; reservationId: string; serviceId: string; driverId: string; expenseId: string; reviewerId: string }) {
  await prisma.serviceExpense.delete({ where: { id: ids.expenseId } }).catch(() => {});
  await prisma.service.delete({ where: { id: ids.serviceId } }).catch(() => {});
  await prisma.reservation.delete({ where: { id: ids.reservationId } }).catch(() => {});
  await prisma.client.delete({ where: { id: ids.clientId } }).catch(() => {});
  await prisma.driver.delete({ where: { id: ids.driverId } }).catch(() => {});
  await prisma.user.delete({ where: { id: ids.reviewerId } }).catch(() => {});
}

describe("ServiceExpense: aprovação gera repasse elegível, rejeição não gera nada", () => {
  it("aprovar cria um FinanceEntry (despesa, despesa_servico) já elegível a pagamento", async () => {
    const { client, reservation, driver, service, expense, reviewer } = await seedFixture();

    try {
      const approved = await approveServiceExpense(expense.id, reviewer.id);
      expect(approved.status).toBe("aprovado");
      expect(approved.finance_entry_id).not.toBeNull();

      const entry = await prisma.financeEntry.findUniqueOrThrow({ where: { id: approved.finance_entry_id! } });
      expect(entry.type).toBe("despesa");
      expect(entry.category).toBe("despesa_servico");
      expect(entry.party_type).toBe("motorista");
      expect(entry.party_id).toBe(driver.id);
      expect(entry.amount.toString()).toBe("80");
      expect(entry.payment_eligible).toBe(true);
      expect(entry.status).toBe("pendente");
    } finally {
      await cleanup({
        clientId: client.id,
        reservationId: reservation.id,
        serviceId: service.id,
        driverId: driver.id,
        expenseId: expense.id,
        reviewerId: reviewer.id,
      });
    }
  });

  it("aprovar de novo a mesma despesa não duplica o FinanceEntry (idempotente)", async () => {
    const { client, reservation, driver, service, expense, reviewer } = await seedFixture();

    try {
      const first = await approveServiceExpense(expense.id, reviewer.id);
      const second = await approveServiceExpense(expense.id, reviewer.id);

      expect(second.id).toBe(first.id);
      expect(second.finance_entry_id).toBe(first.finance_entry_id);

      const entries = await prisma.financeEntry.findMany({ where: { origin_id: expense.id } });
      expect(entries).toHaveLength(1);
    } finally {
      await cleanup({
        clientId: client.id,
        reservationId: reservation.id,
        serviceId: service.id,
        driverId: driver.id,
        expenseId: expense.id,
        reviewerId: reviewer.id,
      });
    }
  });

  it("rejeitar não gera nenhum FinanceEntry e grava o motivo", async () => {
    const { client, reservation, driver, service, expense, reviewer } = await seedFixture();

    try {
      const rejected = await rejectServiceExpense(expense.id, reviewer.id, "Comprovante ilegível");

      expect(rejected.status).toBe("rejeitado");
      expect(rejected.rejection_reason).toBe("Comprovante ilegível");
      expect(rejected.finance_entry_id).toBeNull();

      const entries = await prisma.financeEntry.findMany({ where: { origin_id: expense.id } });
      expect(entries).toHaveLength(0);
    } finally {
      await cleanup({
        clientId: client.id,
        reservationId: reservation.id,
        serviceId: service.id,
        driverId: driver.id,
        expenseId: expense.id,
        reviewerId: reviewer.id,
      });
    }
  });

  it("uma despesa já aprovada não pode ser rejeitada depois (nem vice-versa)", async () => {
    const { client, reservation, driver, service, expense, reviewer } = await seedFixture();

    try {
      await approveServiceExpense(expense.id, reviewer.id);
      const rejectedAttempt = await rejectServiceExpense(expense.id, reviewer.id, "Tarde demais");

      expect(rejectedAttempt.status).toBe("aprovado");
      expect(rejectedAttempt.rejection_reason).toBeNull();
    } finally {
      await cleanup({
        clientId: client.id,
        reservationId: reservation.id,
        serviceId: service.id,
        driverId: driver.id,
        expenseId: expense.id,
        reviewerId: reviewer.id,
      });
    }
  });
});
