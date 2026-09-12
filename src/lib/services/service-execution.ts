"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { logAudit } from "@/lib/audit";

// Requisito adicional pós-Fase 1 (item 6): o dono/responsável de uma
// empresa fornecedora pode, pelo portal dele, iniciar e finalizar os
// serviços atribuídos aos motoristas cadastrados sob a empresa dele — não
// só o próprio motorista. Autorização fina feita aqui (não via RLS de
// linha inteira, que abriria preço/custo/etc. à escrita de portal) e
// reaproveitada tanto pelo portal do motorista quanto pelo da empresa.
async function assertCanOperateService(serviceId: string) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  const service = await prisma.service.findUniqueOrThrow({ where: { id: serviceId } });

  const isInternal = user.account_type === "internal";
  const isAssignedDriver = user.linked_driver_id === service.driver_id;
  const isSupplierCompany =
    Boolean(service.supplier_id) && user.linked_company_id === service.supplier_id;

  if (!isInternal && !isAssignedDriver && !isSupplierCompany) {
    throw new Error("Você não tem permissão para operar este serviço.");
  }

  return { user, service };
}

export type ServiceExecutionState = { error: string | null };

export async function startService(
  serviceId: string,
): Promise<ServiceExecutionState> {
  try {
    const { user, service } = await assertCanOperateService(serviceId);

    if (service.execution_status !== "agendado") {
      return { error: "Este serviço não está aguardando início." };
    }

    await prisma.service.update({
      where: { id: serviceId },
      data: { execution_status: "em_andamento", started_at: new Date() },
    });

    await logAudit({
      actorId: user.id,
      action: "servico_iniciado",
      entityType: "service",
      entityId: serviceId,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Falha ao iniciar o serviço." };
  }

  revalidatePath("/portal/motorista");
  revalidatePath("/portal/empresa");
  return { error: null };
}

export async function completeService(
  serviceId: string,
): Promise<ServiceExecutionState> {
  try {
    const { user, service } = await assertCanOperateService(serviceId);

    if (service.execution_status !== "em_andamento") {
      return { error: "Este serviço precisa estar em andamento para ser finalizado." };
    }

    await prisma.service.update({
      where: { id: serviceId },
      data: { execution_status: "concluido", completed_at: new Date() },
    });

    await logAudit({
      actorId: user.id,
      action: "servico_finalizado",
      entityType: "service",
      entityId: serviceId,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Falha ao finalizar o serviço." };
  }

  revalidatePath("/portal/motorista");
  revalidatePath("/portal/empresa");
  return { error: null };
}
