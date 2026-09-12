// Sino de notificação dos 3 portais externos (spec seção 7 —
// PortalNotification). Sem dedupe_key/idempotência própria na spec (ao
// contrário de ChangeRequest/Alert) — é só um aviso, não um registro de
// negócio; reenviar o mesmo evento duas vezes só duplicaria o aviso, sem
// consequência financeira ou de auditoria.
import type { EntityRefType, PortalNotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function notifyPortalUser(params: {
  userId: string;
  type: PortalNotificationType;
  message: string;
  entityRefType?: EntityRefType;
  entityRefId?: string;
}) {
  await prisma.portalNotification.create({
    data: {
      user_id: params.userId,
      type: params.type,
      message: params.message,
      entity_ref_type: params.entityRefType,
      entity_ref_id: params.entityRefId,
    },
  });
}

// Notifica todos os usuários de portal vinculados a uma empresa (uma
// empresa pode ter mais de um login de portal).
export async function notifyCompanyPortalUsers(params: {
  companyId: string;
  type: PortalNotificationType;
  message: string;
  entityRefType?: EntityRefType;
  entityRefId?: string;
}) {
  const users = await prisma.user.findMany({
    where: { linked_company_id: params.companyId, account_type: "portal", status: "ativo" },
    select: { id: true },
  });

  for (const user of users) {
    await notifyPortalUser({ ...params, userId: user.id });
  }
}

// Notifica o usuário de portal vinculado a um motorista, se existir (nem
// todo motorista tem login de portal criado).
export async function notifyDriverPortalUser(params: {
  driverId: string;
  type: PortalNotificationType;
  message: string;
  entityRefType?: EntityRefType;
  entityRefId?: string;
}) {
  const user = await prisma.user.findFirst({
    where: { linked_driver_id: params.driverId, account_type: "portal", status: "ativo" },
    select: { id: true },
  });

  if (!user) {
    return;
  }

  await notifyPortalUser({ ...params, userId: user.id });
}

export async function getUnreadNotifications(userId: string) {
  return prisma.portalNotification.findMany({
    where: { user_id: userId, read: false },
    orderBy: { created_at: "desc" },
    take: 20,
  });
}

export async function markNotificationRead(notificationId: string, userId: string) {
  await prisma.portalNotification.updateMany({
    where: { id: notificationId, user_id: userId },
    data: { read: true, read_at: new Date() },
  });
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.portalNotification.updateMany({
    where: { user_id: userId, read: false },
    data: { read: true, read_at: new Date() },
  });
}
