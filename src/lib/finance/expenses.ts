// Despesa de motorista por serviço (spec seção 7 — ServiceExpense):
// motorista registra pelo portal, admin aprova/rejeita. Aprovar gera
// automaticamente um FinanceEntry de repasse ao motorista — idempotente
// por auto_key (a mesma despesa nunca gera dois lançamentos, mesmo que a
// aprovação seja chamada de novo por engano).
import { prisma } from "@/lib/prisma";
import { createFinanceEntry, markFinanceEntryEligible } from "@/lib/finance/ledger";
import { generateServiceFinanceEntries } from "@/lib/finance/settlement";

export async function approveServiceExpense(expenseId: string, reviewerId: string) {
  const expense = await prisma.serviceExpense.findUniqueOrThrow({
    where: { id: expenseId },
    include: { service: { select: { reservation_id: true } } },
  });

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
    reservation_id: expense.service?.reservation_id ?? null,
    origin_type: "manual",
    origin_id: expense.id,
    auto_key: `expense:${expense.id}`,
  });
  // A aprovação em si já É o marco que libera o pagamento — não existe um
  // marco operacional futuro para esperar, ao contrário do repasse por
  // serviço concluído do motor de liquidação.
  await markFinanceEntryEligible(entry.id);

  const updated = await prisma.serviceExpense.update({
    where: { id: expenseId },
    data: {
      status: "aprovado",
      reviewed_by_id: reviewerId,
      reviewed_at: new Date(),
      finance_entry_id: entry.id,
    },
  });
  if (updated.service_id) await generateServiceFinanceEntries(updated.service_id);
  return updated;
}

export async function rejectServiceExpense(expenseId: string, reviewerId: string, reason: string) {
  const expense = await prisma.serviceExpense.findUniqueOrThrow({ where: { id: expenseId } });

  if (expense.status !== "pendente") {
    return expense;
  }

  const updated = await prisma.serviceExpense.update({
    where: { id: expenseId },
    data: {
      status: "rejeitado",
      reviewed_by_id: reviewerId,
      reviewed_at: new Date(),
      rejection_reason: reason,
    },
  });
  if (updated.service_id) await generateServiceFinanceEntries(updated.service_id);
  return updated;
}
