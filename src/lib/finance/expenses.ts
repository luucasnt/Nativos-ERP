// Despesa de motorista por serviço (spec seção 7 — ServiceExpense):
// motorista registra pelo portal, admin aprova/rejeita. Aprovar gera
// automaticamente um FinanceEntry de repasse ao motorista — idempotente
// por auto_key (a mesma despesa nunca gera dois lançamentos, mesmo que a
// aprovação seja chamada de novo por engano).
import { prisma } from "@/lib/prisma";
import { createFinanceEntry, markFinanceEntryEligible } from "@/lib/finance/ledger";

export async function approveServiceExpense(expenseId: string, reviewerId: string) {
  const expense = await prisma.serviceExpense.findUniqueOrThrow({ where: { id: expenseId } });

  if (expense.status !== "pendente") {
    return expense;
  }

  const entry = await createFinanceEntry({
    type: "despesa",
    category: "despesa_servico",
    amount: expense.amount,
    party_type: "motorista",
    party_id: expense.driver_id,
    service_id: expense.service_id,
    origin_type: "manual",
    origin_id: expense.id,
    auto_key: `expense:${expense.id}`,
  });
  // A aprovação em si já É o marco que libera o pagamento — não existe um
  // marco operacional futuro para esperar, ao contrário do repasse por
  // serviço concluído do motor de liquidação.
  await markFinanceEntryEligible(entry.id);

  return prisma.serviceExpense.update({
    where: { id: expenseId },
    data: {
      status: "aprovado",
      reviewed_by_id: reviewerId,
      reviewed_at: new Date(),
      finance_entry_id: entry.id,
    },
  });
}

export async function rejectServiceExpense(expenseId: string, reviewerId: string, reason: string) {
  const expense = await prisma.serviceExpense.findUniqueOrThrow({ where: { id: expenseId } });

  if (expense.status !== "pendente") {
    return expense;
  }

  return prisma.serviceExpense.update({
    where: { id: expenseId },
    data: {
      status: "rejeitado",
      reviewed_by_id: reviewerId,
      reviewed_at: new Date(),
      rejection_reason: reason,
    },
  });
}
