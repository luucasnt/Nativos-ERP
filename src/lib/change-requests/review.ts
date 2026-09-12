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

// "reserva_confirmada" NÃO é disparado por aqui: aprovar um pedido de
// nova reserva só aprova o PEDIDO — a reserva de fato (com código) só
// passa a existir quando o admin a monta manualmente em
// /admin/reservas/novo, e é lá (quando o status calculado chega a
// "confirmado" pela primeira vez) que essa notificação faria sentido —
// ainda não construído nesta fase (ver README).
function notificationTypeFor(type: string, status: ChangeRequestStatus): PortalNotificationType {
  if (status === "aprovada" && type === "alteracao") return "alteracao_aprovada";
  if (status === "aprovada" && type === "cancelamento") return "cancelamento_aprovado";
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
    include: { reservation: true },
  });

  const notificationType = notificationTypeFor(changeRequest.type, changeRequest.status);
  const message = `Sua solicitação ${changeRequest.protocol} foi atualizada: ${changeRequest.status}.`;
  const emailVariables = {
    protocolo: changeRequest.protocol,
    codigo_reserva: changeRequest.reservation?.code ?? "",
  };

  if (changeRequest.requester_type === "company") {
    await notifyCompanyPortalUsers({
      companyId: changeRequest.requester_id,
      type: notificationType,
      message,
      entityRefType: "change_request",
      entityRefId: changeRequest.id,
      emailVariables,
    });
  } else {
    await notifyDriverPortalUser({
      driverId: changeRequest.requester_id,
      type: notificationType,
      message,
      entityRefType: "change_request",
      entityRefId: changeRequest.id,
      emailVariables,
    });
  }

  return changeRequest;
}
