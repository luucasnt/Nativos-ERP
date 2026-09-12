"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/notifications";

export async function markNotificationReadPortal(notificationId: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  await markNotificationRead(notificationId, user.id);
  revalidatePath("/portal/empresa");
  revalidatePath("/portal/motorista");
}

export async function markAllNotificationsReadPortal() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  await markAllNotificationsRead(user.id);
  revalidatePath("/portal/empresa");
  revalidatePath("/portal/motorista");
}
