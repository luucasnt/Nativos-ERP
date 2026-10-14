"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertActiveUser } from "@/lib/auth/get-current-user";
import { logAudit } from "@/lib/audit";
import { recalculateReservationStatus } from "@/lib/reservations/status";
import { markServiceFinanceEntriesEligible } from "@/lib/finance/settlement";
import { markReservationCommissionsEligible } from "@/lib/finance/commissions";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { assertServiceResources } from "@/lib/services/resource-validation";

// Requisito adicional pós-Fase 1 (item 6): o dono/responsável de uma
// empresa fornecedora pode, pelo portal dele, iniciar e finalizar os
// serviços atribuídos aos motoristas cadastrados sob a empresa dele — não
// só o próprio motorista. Autorização fina feita aqui (não via RLS de
// linha inteira, que abriria preço/custo/etc. à escrita de portal) e
// reaproveitada tanto pelo portal do motorista quanto pelo da empresa.
async function assertCanOperateService(serviceId: string, db: Prisma.TransactionClient = prisma, actor?: Awaited<ReturnType<typeof assertActiveUser>>) {
  const user = actor ?? await assertActiveUser();

  const service = await db.service.findUniqueOrThrow({ where: { id: serviceId } });

  const isInternal = user.account_type === "internal";
  const isAssignedDriver =
    user.account_type === "portal" && Boolean(service.driver_id) && user.linked_driver_id === service.driver_id;
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
      return { error: "Este serviço ainda aguarda confirmação." };
    }

    if (service.execution_status !== "agendado") {
      return { error: "Este serviço não está aguardando início." };
    }
    if (service.execution_type === "propria" && (!service.driver_id || !service.vehicle_id)) return { error: "Defina o motorista e o veículo antes de iniciar a operação própria." };
    if (service.driver_id || service.vehicle_id) await assertServiceResources(service);

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

  revalidatePath("/portal/motorista/servicos");
  revalidatePath("/portal/empresa/operacao");
  revalidatePath("/portal/empresa/financeiro");
  revalidatePath("/admin/financeiro");
  revalidatePath("/portal/motorista");
  revalidatePath("/portal/empresa");
  return { error: null };
}

export async function completeService(serviceId: string, input?: unknown): Promise<ServiceExecutionState> {
  try {
    const authorized = await assertCanOperateService(serviceId);
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM reservations WHERE id = ${authorized.service.reservation_id}::uuid FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM services WHERE id = ${serviceId}::uuid FOR UPDATE`;
      const { user, service } = await assertCanOperateService(serviceId, tx, authorized.user);
      if (service.reservation_id !== authorized.service.reservation_id) throw new Error("O serviço foi alterado. Atualize a operação e tente novamente.");
      if (service.execution_status !== "em_andamento" && service.execution_status !== "concluido") {
        throw new Error("Inicie o serviço antes de finalizar. Atualize a operação para conferir o status atual.");
      }
      // Retries repair an interrupted legacy completion without changing its checklist or timestamp.
      const alreadyCompleted = service.execution_status === "concluido";
      const completion = checklistSchema.safeParse(alreadyCompleted || input === undefined ? service.completion_checklist : input);
      if (!completion.success || !["passenger_embarked", "service_delivered", "payment_checked"].every((key) => completion.data[key as keyof typeof completion.data] === true)) {
        throw new Error("Conclua o checklist de finalização antes de encerrar o serviço.");
      }
      if (!alreadyCompleted) {
        await tx.service.update({ where: { id: serviceId }, data: {
          execution_status: "concluido", completed_at: new Date(), completion_checklist: completion.data,
          incident_notes: completion.data.notes ?? null,
        } });
        await tx.auditLog.create({ data: { actor_id: user.id, action: "checklist_final_salvo", entity_type: "service", entity_id: serviceId, metadata: completion.data } });
      }
      await markServiceFinanceEntriesEligible(serviceId, tx);
      const { status } = await recalculateReservationStatus(service.reservation_id, tx);
      if (status === "concluido") await markReservationCommissionsEligible(service.reservation_id, tx);
      const audited = await tx.auditLog.findFirst({ where: { entity_id: serviceId, entity_type: "service", action: "servico_finalizado" } });
      if (!audited) await tx.auditLog.create({ data: { actor_id: user.id, action: "servico_finalizado", entity_type: "service", entity_id: serviceId, metadata: { recovered: alreadyCompleted } } });
    }, { maxWait: 10000, timeout: 30000 });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Falha ao finalizar o serviço. Tente novamente." };
  }
  for (const path of ["/portal/motorista/servicos", "/portal/empresa/operacao", "/portal/empresa/financeiro", "/admin/financeiro", "/portal/motorista", "/portal/empresa", "/admin", "/admin/reservas"]) revalidatePath(path);
  return { error: null };
}
