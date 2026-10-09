import { paymentDateWhere } from "@/lib/finance/payment-date";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Operação na Bahia (UTC-3), independente do fuso do servidor.
export function businessDay(now = new Date()) {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bahia", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const start = new Date(`${day}T00:00:00-03:00`);
  return { start, end: new Date(start.getTime() + 86400000) };
}
export async function closeCash(accountId: string, counted: string, actorId: string, now = new Date()) {
  if (!/^-?\d{1,10}([.,]\d{1,2})?$/.test(counted.trim())) throw new Error("Saldo contado inválido. Use até duas casas decimais.");
  const countedBalance = new Prisma.Decimal(counted.trim().replace(",", "."));
  const { start, end } = businessDay(now);
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM bank_accounts WHERE id = ${accountId}::uuid FOR UPDATE`;
    const account = await tx.bankAccount.findUniqueOrThrow({ where: { id: accountId } });
    if (!account.active) throw new Error("Selecione uma conta ativa.");
    if (await tx.cashClosing.findFirst({ where: { bank_account_id: accountId, closing_date: { gte: start, lt: end }, reopened_at: null } })) throw new Error("Esta conta já possui um fechamento para hoje. Reabra-o antes de corrigir.");
    const movements = await tx.payment.groupBy({ by: ["type"], where: { bank_account_id: accountId, ...paymentDateWhere({ lt: start }), reversed_at: null, estorno_of_id: null }, _sum: { amount: true } });
    const opening = movements.reduce((balance, row) => row.type === "recebimento" ? balance.plus(row._sum.amount ?? 0) : balance.minus(row._sum.amount ?? 0), account.initial_balance);
    const today = await tx.payment.groupBy({ by: ["type"], where: { bank_account_id: accountId, ...paymentDateWhere({ gte: start, lt: end }), reversed_at: null, estorno_of_id: null }, _sum: { amount: true } });
    const totalIn = today.find((row) => row.type === "recebimento")?._sum.amount ?? new Prisma.Decimal(0);
    const totalOut = today.find((row) => row.type === "pagamento")?._sum.amount ?? new Prisma.Decimal(0);
    const theoretical = opening.plus(totalIn).minus(totalOut);
    const difference = countedBalance.minus(theoretical);
    const closing = await tx.cashClosing.create({ data: {
      bank_account_id: accountId, closing_date: start, opening_balance: opening, total_in: totalIn, total_out: totalOut,
      theoretical_balance: theoretical, counted_balance: countedBalance, difference,
      difference_type: difference.isZero() ? null : "nao_conciliado", performed_by_id: actorId,
    } });
    await tx.auditLog.create({ data: { actor_id: actorId, action: "caixa_fechado", entity_type: "other", entity_id: closing.id, metadata: { bankAccountId: accountId, difference: difference.toFixed(2) } } });
    return closing;
  });
}
export async function reopenCash(closingId: string, reason: string, actorId: string) {
  if (reason.trim().length < 3 || reason.trim().length > 1000) throw new Error("Informe um motivo entre 3 e 1000 caracteres.");
  return prisma.$transaction(async (tx) => {
    const closing = await tx.cashClosing.findUniqueOrThrow({ where: { id: closingId } });
    await tx.$queryRaw`SELECT id FROM bank_accounts WHERE id = ${closing.bank_account_id}::uuid FOR UPDATE`;
    const changed = await tx.cashClosing.updateMany({ where: { id: closingId, reopened_at: null }, data: { reopened_at: new Date(), reopened_by_id: actorId, reopen_reason: reason.trim() } });
    if (changed.count) await tx.auditLog.create({ data: { actor_id: actorId, action: "caixa_reaberto", entity_type: "other", entity_id: closingId, metadata: { reason: reason.trim() } } });
  });
}
