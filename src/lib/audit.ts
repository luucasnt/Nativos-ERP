import "server-only";
import type { EntityRefType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Grava uma entrada no log de auditoria (append-only, ver trigger de banco
// em prisma/migrations/20260912150700_financial_integrity_triggers). Toda
// ação administrativa relevante (criação/edição de cadastro, aprovação,
// rejeição, criação de login etc.) deve passar por aqui.
export async function logAudit(params: {
  actorId: string | null;
  action: string;
  entityType: EntityRefType;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  await prisma.auditLog.create({
    data: {
      actor_id: params.actorId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      metadata: params.metadata,
    },
  });
}
