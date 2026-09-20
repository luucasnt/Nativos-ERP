"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertActiveUser } from "@/lib/auth/get-current-user";
import { logAudit } from "@/lib/audit";
import { recalculateReservationStatus } from "@/lib/reservations/status";
import { markServiceFinanceEntriesEligible } from "@/lib/finance/settlement";
import { markReservationCommissionsEligible } from "@/lib/finance/commissions";
import { z } from "zod";

// Requisito adicional pós-Fase 1 (item 6): o dono/responsável de uma
// empresa fornecedora pode, pelo portal dele, iniciar e finalizar os
// serviços atribuídos aos motoristas cadastrados sob a empresa dele — não
// só o próprio motorista. Autorização fina feita aqui (não via RLS de
// linha inteira, que abriria preço/custo/etc. à escrita de portal) e
// reaproveitada tanto pelo portal do motorista quanto pelo da empresa.
async function assertCanOperateService(serviceId: string) {
  const user = await assertActiveUser();

  const service = await prisma.service.findUniqueOrThrow({ where: { id: serviceId } });

  const isInternal = user.account_type === "internal";
  const isAssignedDriver =
    user.account_type === "portal" && user.linked_driver_id === service.driver_id;
  const isSupplierCompany =
    user.account_type === "portal" &&
    Boolean(service.supplier_id) &&
    user.linked_company_id === service.supplier_id &&
    Boolean(user.linked_company?.roles.includes("fornecedor"));

  if (!isInternal && !isAssignedDriver && !isSupplierCompany) {
    throw new Error("Você não tem permissão para operar este serviço.");
  }

  return { user, service };
}

export type ServiceExecutionState = { error: string | null };

const checklistSchema = z.object({
  vehicle_clean: z.boolean().optional(),
  fuel_checked: z.boolean().optional(),
  tires_checked: z.boolean().optional(),
  documents_ready: z.boolean().optional(),
  passenger_items_ready: z.boolean().optional(),
  passenger_embarked: z.boolean().optional(),
  service_delivered: z.boolean().optional(),
  payment_checked: z.boolean().optional(),
  incident_reported: z.boolean().optional(),
  notes: z.string().max(800).optional(),
});

export async function saveServiceChecklist(serviceId: string, phase: "preflight" | "completion", input: unknown): Promise<ServiceExecutionState> {
  try {
    const { user, service } = await assertCanOperateService(serviceId);
    const checklist = checklistSchema.parse(input);
    if (phase === "preflight" && service.execution_status !== "agendado") return { error: "O checklist inicial só pode ser alterado antes do início." };
    if (phase === "completion" && service.execution_status !== "em_andamento") return { error: "O checklist de finalização só pode ser alterado durante o serviço." };
    await prisma.service.update({ where: { id: serviceId }, data: phase === "preflight" ? { preflight_checklist: checklist } : { completion_checklist: checklist, incident_notes: checklist.notes ?? null } });
    await logAudit({ actorId: user.id, action: phase === "preflight" ? "checklist_inicial_salvo" : "checklist_final_salvo", entityType: "service", entityId: serviceId, metadata: checklist });
    revalidatePath("/portal/motorista/servicos");
    revalidatePath("/portal/empresa/operacao");
    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Não foi possível salvar o checklist." };
  }
}

export async function startService(
  serviceId: string,
): Promise<ServiceExecutionState> {
  try {
    const { user, service } = await assertCanOperateService(serviceId);

    if (service.acceptance_status !== "aceito") {
      return { error: "Este serviço ainda não foi aceito pelo fornecedor." };
    }

    if (service.execution_status !== "agendado") {
      return { error: "Este serviço não está aguardando início." };
    }

    const preflight = checklistSchema.safeParse(service.preflight_checklist);
    if (!preflight.success || !["vehicle_clean", "fuel_checked", "tires_checked", "documents_ready", "passenger_items_ready"].every((key) => preflight.data[key as keyof typeof preflight.data] === true)) {
      return { error: "Conclua o checklist de saída antes de iniciar o serviço." };
    }

    await prisma.service.update({
      where: { id: serviceId },
      data: { execution_status: "em_andamento", started_at: new Date() },
    });

    await recalculateReservationStatus(service.reservation_id);

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

    const completion = checklistSchema.safeParse(service.completion_checklist);
    if (!completion.success || !["passenger_embarked", "service_delivered", "payment_checked"].every((key) => completion.data[key as keyof typeof completion.data] === true)) {
      return { error: "Conclua o checklist de finalização antes de encerrar o serviço." };
    }

    await prisma.service.update({
      where: { id: serviceId },
      data: { execution_status: "concluido", completed_at: new Date() },
    });

    // Regra não-negociável (spec seção 6, item 5): só agora, com o marco
    // operacional atingido, os lançamentos deste serviço passam a ser
    // elegíveis a pagamento.
    await markServiceFinanceEntriesEligible(serviceId);

    const { status } = await recalculateReservationStatus(service.reservation_id);
    if (status === "concluido") {
      await markReservationCommissionsEligible(service.reservation_id);
    }

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
