"use server";

import { revalidatePath } from "next/cache";
import { requireInternalUser } from "@/lib/auth/get-current-user";
import { logAudit } from "@/lib/audit";
import { approveServiceExpense, rejectServiceExpense } from "@/lib/finance/expenses";
import { notifyDriverPortalUser } from "@/lib/notifications";

export async function approveExpense(expenseId: string) {
  const user = await requireInternalUser();
  const expense = await approveServiceExpense(expenseId, user.id);

  await logAudit({
    actorId: user.id,
    action: "despesa_aprovada",
    entityType: "service",
    entityId: expense.service_id,
  });

  revalidatePath("/admin/despesas");
}

export async function rejectExpense(expenseId: string, reason: string) {
  const user = await requireInternalUser();
  const expense = await rejectServiceExpense(expenseId, user.id, reason);

  await notifyDriverPortalUser({
    driverId: expense.driver_id,
    type: "despesa_rejeitada",
    message: `Sua despesa foi rejeitada: ${reason}`,
    entityRefType: "service",
    entityRefId: expense.service_id,
  });

  await logAudit({
    actorId: user.id,
    action: "despesa_rejeitada",
    entityType: "service",
    entityId: expense.service_id,
    metadata: { reason },
  });

  revalidatePath("/admin/despesas");
}
