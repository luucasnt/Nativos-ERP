import { prisma } from "@/lib/prisma";

// Saldo em contas = saldo inicial de cada conta ativa + recebimentos -
// pagamentos já registrados (não estornados). Nunca lido de um campo
// "balance" gravado — sempre recalculado, pelo mesmo motivo de todo o
// motor financeiro (Fase 4): nenhum valor consolidado é fonte da verdade,
// só a soma dos lançamentos reais.
export async function getTotalBankBalance() {
  const accounts = await prisma.bankAccount.findMany({ where: { active: true } });

  if (accounts.length === 0) {
    return 0;
  }

  const grouped = await prisma.payment.groupBy({
    by: ["bank_account_id", "type"],
    where: {
      bank_account_id: { in: accounts.map((a) => a.id) },
      reversed_at: null,
    },
    _sum: { amount: true },
  });

  const movementByAccount = new Map<string, number>();
  for (const row of grouped) {
    if (!row.bank_account_id) continue;
    const amount = Number(row._sum.amount ?? 0);
    const signed = row.type === "recebimento" ? amount : -amount;
    movementByAccount.set(
      row.bank_account_id,
      (movementByAccount.get(row.bank_account_id) ?? 0) + signed,
    );
  }

  return accounts.reduce(
    (total, account) =>
      total + Number(account.initial_balance) + (movementByAccount.get(account.id) ?? 0),
    0,
  );
}
