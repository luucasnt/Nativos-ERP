// Integração real (Postgres). Como finance_entries e payments têm DELETE
// bloqueado por trigger (Fase 1/4 — ver
// prisma/migrations/20260912150700_financial_integrity_triggers), a conta
// bancária criada aqui fica permanente (mesmo racional dos outros testes
// financeiros de integridade) — por isso um único caso, verificando
// initial_balance + recebimento - pagamento.
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { createFinanceEntry, createPayment } from "@/lib/finance/ledger";
import { getTotalBankBalance } from "@/lib/finance/bank-balance";

const prisma = new PrismaClient();

afterAll(async () => {
  await prisma.$disconnect();
});

describe("getTotalBankBalance", () => {
  it("soma saldo inicial + recebimentos - pagamentos das contas ativas", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const client = await prisma.client.create({
      data: { name: `Cliente Saldo ${suffix}`, origin: "proprio" },
    });
    const reservation = await prisma.reservation.create({
      data: { code: `SALDO-${suffix}`, client_id: client.id },
    });

    const account = await prisma.bankAccount.create({
      data: { name: `Conta Teste ${suffix}`, type: "corrente", initial_balance: 1000 },
    });

    // Chamado depois de criar a conta (já com initial_balance somado) —
    // o delta abaixo isola só o efeito dos pagamentos, não do saldo
    // inicial da conta nova.
    const before = await getTotalBankBalance();

    const receitaEntry = await createFinanceEntry({
      type: "receita",
      category: "recebimento_cliente",
      amount: 500,
      party_type: "cliente",
      reservation_id: reservation.id,
      origin_type: "manual",
      auto_key: `saldo-test-receita-${suffix}`,
    });
    await createPayment({
      finance_entry_id: receitaEntry.id,
      type: "recebimento",
      amount: 500,
      payment_method: "pix",
      bank_account_id: account.id,
      dedupe_key: `saldo-test-receita-pay-${suffix}`,
    });

    const despesaEntry = await createFinanceEntry({
      type: "despesa",
      category: "pagamento_fornecedor",
      amount: 120,
      party_type: "fornecedor",
      reservation_id: reservation.id,
      origin_type: "manual",
      auto_key: `saldo-test-despesa-${suffix}`,
    });
    await createPayment({
      finance_entry_id: despesaEntry.id,
      type: "pagamento",
      amount: 120,
      payment_method: "pix",
      bank_account_id: account.id,
      dedupe_key: `saldo-test-despesa-pay-${suffix}`,
    });

    const after = await getTotalBankBalance();

    // `before` já inclui os 1000 de saldo inicial da conta nova — só os
    // pagamentos entram no delta.
    expect(after - before).toBeCloseTo(500 - 120, 2);
  });
});
