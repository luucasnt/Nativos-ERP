"use server";

import { revalidatePath } from "next/cache";
import { requireInternalUser } from "@/lib/auth/get-current-user";
import { logAudit } from "@/lib/audit";
import { archiveAlert } from "@/lib/alerts";

export async function archiveAlertAction(alertId: string) {
  const user = await requireInternalUser();

  await archiveAlert(alertId, user.id);

  await logAudit({
    actorId: user.id,
    action: "alerta_arquivado",
    entityType: "other",
    entityId: alertId,
  });

  revalidatePath("/admin/alertas");
}
