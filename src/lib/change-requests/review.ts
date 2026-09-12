// Decisão do admin sobre um ChangeRequest (spec seção 7). Não aciona
// nenhuma automação sobre reserva/serviço/financeiro por conta própria —
// aprovar um pedido de alteração/cancelamento/repasse só registra a
// decisão; a mudança de fato (editar a reserva, cancelar o serviço,
// registrar o pagamento) continua sendo feita pelo admin nas telas já
// existentes (Fase 3/4), com toda a validação que elas já têm. Automatizar
// isso arriscaria aplicar a mudança errada sem revisão humana.
import type { ChangeRequestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notifyCompanyPortalUsers, notifyDriverPortalUser } from "@/lib/notifications";
import type { PortalNotificationType } from "@prisma/client";

function notificationTypeFor(type: string, status: ChangeRequestStatus): PortalNotificationType {
  if (status === "aprovada" && type === "alteracao") return "alteracao_aprovada";
  if (status === "aprovada" && type === "cancelamento") return "cancelamento_aprovado";
  if (status === "aprovada" && type === "nova_reserva") return "reserva_confirmada";
  return "solicitacao_atualizada";
}

export async function reviewChangeRequest(params: {
  id: string;
  status: ChangeRequestStatus;
  reviewerId: string;
  responseNote?: string | null;
}) {
  const changeRequest = await prisma.changeRequest.update({
    where: { id: params.id },
    data: {
      status: params.status,
      reviewed_by_id: params.reviewerId,
      reviewed_at: new Date(),
      response_note: params.responseNote || null,
    },
  });

  const notificationType = notificationTypeFor(changeRequest.type, changeRequest.status);
  const message = `Sua solicitação ${changeRequest.protocol} foi atualizada: ${changeRequest.status}.`;

  if (changeRequest.requester_type === "company") {
    await notifyCompanyPortalUsers({
      companyId: changeRequest.requester_id,
      type: notificationType,
      message,
      entityRefType: "change_request",
      entityRefId: changeRequest.id,
    });
  } else {
    await notifyDriverPortalUser({
      driverId: changeRequest.requester_id,
      type: notificationType,
      message,
      entityRefType: "change_request",
      entityRefId: changeRequest.id,
    });
  }

  return changeRequest;
}
