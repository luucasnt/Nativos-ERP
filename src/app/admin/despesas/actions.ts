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
    entityType: expense.service_id ? "service" : "vehicle",
    entityId: expense.service_id ?? expense.vehicle_id ?? expense.id,
  });

  revalidatePath("/admin/despesas");
}

export async function rejectExpense(expenseId: string, reason: string) {
  const user = await requireInternalUser();
  const expense = await rejectServiceExpense(expenseId, user.id, reason);

  if (expense.service_id) {
    await notifyDriverPortalUser({
      driverId: expense.driver_id,
      type: "despesa_rejeitada",
      message: `Sua despesa foi rejeitada: ${reason}`,
      entityRefType: "service",
      entityRefId: expense.service_id,
    });
  }

  await logAudit({
    actorId: user.id,
    action: "despesa_rejeitada",
    entityType: expense.service_id ? "service" : "vehicle",
    entityId: expense.service_id ?? expense.vehicle_id ?? expense.id,
    metadata: { reason },
  });

  revalidatePath("/admin/despesas");
}
