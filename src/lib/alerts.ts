// Painel de exceções internas (spec seção 7 — Alert). Idempotente por
// dedupe_key: chamar de novo para a mesma condição nunca duplica — se o
// alerta ainda está aberto, atualiza os dados (a severidade pode ter
// mudado); se já foi arquivado manualmente e a condição voltou a
// acontecer, reabre em vez de colidir com a constraint UNIQUE de
// dedupe_key (ver README, decisão INFERIDA). "archived" só muda por ação
// humana (`archiveAlert`) — nenhuma condição se resolve sozinha aqui.
import type { AlertSeverity, AlertType, EntityRefType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function createAlert(params: {
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  entityRefType?: EntityRefType;
  entityRefId?: string;
  persistent?: boolean;
  dedupeKey?: string;
}) {
  const persistent = params.persistent ?? false;

  if (params.dedupeKey) {
    const existing = await prisma.alert.findUnique({ where: { dedupe_key: params.dedupeKey } });
    if (existing) {
      return prisma.alert.update({
        where: { id: existing.id },
        data: {
          type: params.type,
          severity: params.severity,
          message: params.message,
          persistent,
          ...(existing.archived ? { archived: false, archived_at: null, archived_by_id: null } : {}),
        },
      });
    }
  }

  return prisma.alert.create({
    data: {
      type: params.type,
      severity: params.severity,
      message: params.message,
      entity_ref_type: params.entityRefType,
      entity_ref_id: params.entityRefId,
      persistent,
      dedupe_key: params.dedupeKey,
    },
  });
}

export async function archiveAlert(alertId: string, archivedById: string) {
  return prisma.alert.update({
    where: { id: alertId },
    data: { archived: true, archived_at: new Date(), archived_by_id: archivedById },
  });
}
