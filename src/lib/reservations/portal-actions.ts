"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { acceptService, rejectService } from "@/lib/reservations/acceptance";
import { logAudit } from "@/lib/audit";

export type PortalAcceptanceState = { error: string | null };

async function assertCanRespond(serviceId: string) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  const service = await prisma.service.findUniqueOrThrow({ where: { id: serviceId } });

  if (!user.linked_company_id || service.supplier_id !== user.linked_company_id) {
    throw new Error("Você não tem permissão para responder a este serviço.");
  }

  return { user, service };
}

export async function acceptServicePortal(serviceId: string): Promise<PortalAcceptanceState> {
  try {
    const { user } = await assertCanRespond(serviceId);

    await acceptService(serviceId);

    await logAudit({
      actorId: user.id,
      action: "servico_aceito_pelo_fornecedor",
      entityType: "service",
      entityId: serviceId,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Falha ao registrar o aceite." };
  }

  revalidatePath("/portal/empresa");
  return { error: null };
}

export async function rejectServicePortal(
  serviceId: string,
  reason: string,
): Promise<PortalAcceptanceState> {
  if (!reason.trim()) {
    return { error: "Informe o motivo da recusa." };
  }

  try {
    const { user } = await assertCanRespond(serviceId);

    await rejectService(serviceId, reason);

    await logAudit({
      actorId: user.id,
      action: "servico_recusado_pelo_fornecedor",
      entityType: "service",
      entityId: serviceId,
      metadata: { reason },
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Falha ao registrar a recusa." };
  }

  revalidatePath("/portal/empresa");
  return { error: null };
}
