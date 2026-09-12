// Sino de notificação dos 3 portais externos (spec seção 7 —
// PortalNotification). Sem dedupe_key/idempotência própria na spec (ao
// contrário de ChangeRequest/Alert) — é só um aviso, não um registro de
// negócio; reenviar o mesmo evento duas vezes só duplicaria o aviso, sem
// consequência financeira ou de auditoria.
//
// Fase 7: sempre que existir um EmailTemplate ativo com auto_send=true
// cuja `key` seja igual ao `type` da notificação (convenção já usada pelo
// seed desde a Fase 1/2 — reserva_confirmada, alteracao_aprovada,
// cancelamento_aprovado, pagamento_confirmado), o mesmo evento também
// enfileira um e-mail real (outbox, nunca enviado inline aqui — só
// enfileirado). Eventos sem template correspondente ficam só no sino, sem
// e-mail — não é um comportamento a menos, é a spec não ter pedido e-mail
// para esses ainda.
import type { EntityRefType, PortalNotificationType, RecipientType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { enqueueCommunication } from "@/lib/communication/outbox";

async function enqueueMatchingEmail(params: {
  userId: string;
  type: PortalNotificationType;
  recipientType: RecipientType;
  entityRefId?: string;
  emailVariables?: Record<string, string>;
}) {
  const template = await prisma.emailTemplate.findUnique({ where: { key: params.type } });
  if (!template || !template.active || !template.auto_send) {
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: params.userId }, select: { email: true } });
  if (!user) {
    return;
  }

  await enqueueCommunication({
    templateKey: params.type,
    recipientType: params.recipientType,
    recipientEmail: user.email,
    variables: params.emailVariables ?? {},
    idempotencyKey: `notif:${params.type}:${params.entityRefId ?? "none"}:${params.userId}`,
  });
}

export async function notifyPortalUser(params: {
  userId: string;
  type: PortalNotificationType;
  message: string;
  entityRefType?: EntityRefType;
  entityRefId?: string;
  recipientType?: RecipientType;
  emailVariables?: Record<string, string>;
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

  await enqueueMatchingEmail({
    userId: params.userId,
    type: params.type,
    recipientType: params.recipientType ?? "interno",
    entityRefId: params.entityRefId,
    emailVariables: params.emailVariables,
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
  emailVariables?: Record<string, string>;
}) {
  const company = await prisma.company.findUnique({
    where: { id: params.companyId },
    select: { roles: true },
  });
  const recipientType: RecipientType = company?.roles.includes("parceiro") ? "parceiro" : "fornecedor";

  const users = await prisma.user.findMany({
    where: { linked_company_id: params.companyId, account_type: "portal", status: "ativo" },
    select: { id: true },
  });

  for (const user of users) {
    await notifyPortalUser({ ...params, userId: user.id, recipientType });
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
  emailVariables?: Record<string, string>;
}) {
  const user = await prisma.user.findFirst({
    where: { linked_driver_id: params.driverId, account_type: "portal", status: "ativo" },
    select: { id: true },
  });

  if (!user) {
    return;
  }

  await notifyPortalUser({ ...params, userId: user.id, recipientType: "motorista" });
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
