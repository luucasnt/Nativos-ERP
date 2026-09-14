"use server";

import { revalidatePath } from "next/cache";
import { assertActiveUser } from "@/lib/auth/get-current-user";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/notifications";

export async function markNotificationReadPortal(notificationId: string) {
  const user = await assertActiveUser();

  await markNotificationRead(notificationId, user.id);
  revalidatePath("/portal/empresa");
  revalidatePath("/portal/motorista");
}

export async function markAllNotificationsReadPortal() {
  const user = await assertActiveUser();

  await markAllNotificationsRead(user.id);
  revalidatePath("/portal/empresa");
  revalidatePath("/portal/motorista");
}
