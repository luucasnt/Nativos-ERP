"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { logAudit } from "@/lib/audit";
import {
  confirmDirectCollectionNotReceived,
  confirmDirectCollectionReceived,
} from "@/lib/finance/direct-collection";
import { submitChangeRequest } from "@/lib/change-requests/submit";
import { alertPendingExpense } from "@/lib/alerts/detectors";

const expenseSchema = z.object({
  service_id: z.string().uuid("Selecione o serviço."),
  category_id: z.string().uuid("Selecione a categoria."),
  amount: z
    .string()
    .min(1, "Informe o valor.")
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0, "Valor inválido."),
  // Upload real de comprovante fica para a Fase 7 (Supabase Storage,
  // conforme já documentado no README) — por ora, um link colado à mão.
  receipt_url: z.string().optional(),
});

export type ExpenseFormState = { error: string | null };

export async function submitServiceExpense(
  _prevState: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const user = await getCurrentUser();
  if (!user || !user.linked_driver_id) {
    return { error: "Sessão expirada. Faça login novamente." };
  }

  const parsed = expenseSchema.safeParse({
    service_id: formData.get("service_id"),
    category_id: formData.get("category_id"),
    amount: formData.get("amount"),
    receipt_url: formData.get("receipt_url") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const service = await prisma.service.findUnique({ where: { id: parsed.data.service_id } });
  if (!service || service.driver_id !== user.linked_driver_id) {
    return { error: "Você não tem permissão para registrar despesa neste serviço." };
  }

  const expense = await prisma.serviceExpense.create({
    data: {
      service_id: parsed.data.service_id,
      driver_id: user.linked_driver_id,
      category_id: parsed.data.category_id,
      amount: parsed.data.amount,
      receipt_url: parsed.data.receipt_url || null,
    },
  });

  await alertPendingExpense({
    expenseId: expense.id,
    serviceId: service.id,
    driverName: user.linked_driver?.name ?? "Motorista",
    serviceType: service.type,
  });

  await logAudit({
    actorId: user.id,
    action: "despesa_registrada_pelo_motorista",
    entityType: "service",
    entityId: parsed.data.service_id,
  });

  revalidatePath("/portal/motorista");
  return { error: null };
}

const repasseSchema = z.object({
  dedupe_key: z.string().min(1),
  entry_ids: z.array(z.string().uuid()).optional(),
  nota: z.string().optional(),
});

export type ChangeRequestFormState = { error: string | null };

export async function submitRepasseRequestMotorista(
  _prevState: ChangeRequestFormState,
  formData: FormData,
): Promise<ChangeRequestFormState> {
  const user = await getCurrentUser();
  if (!user || !user.linked_driver_id) {
    return { error: "Sessão expirada. Faça login novamente." };
  }

  const parsed = repasseSchema.safeParse({
    dedupe_key: formData.get("dedupe_key"),
    entry_ids: formData.getAll("entry_ids"),
    nota: formData.get("nota") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const changeRequest = await submitChangeRequest({
    type: "repasse_nativos",
    requesterType: "driver",
    requesterId: user.linked_driver_id,
    allocationDetails: { entry_ids: parsed.data.entry_ids ?? [], nota: parsed.data.nota ?? null },
    dedupeKey: parsed.data.dedupe_key,
  });

  await logAudit({
    actorId: user.id,
    action: "solicitacao_repasse_criada",
    entityType: "change_request",
    entityId: changeRequest.id,
  });

  revalidatePath("/portal/motorista");
  return { error: null };
}

export type DirectCollectionState = { error: string | null };

async function assertOwnDriverService(serviceId: string) {
  const user = await getCurrentUser();
  if (!user || !user.linked_driver_id) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  const service = await prisma.service.findUniqueOrThrow({ where: { id: serviceId } });
  if (service.driver_id !== user.linked_driver_id) {
    throw new Error("Você não tem permissão para confirmar o recebimento deste serviço.");
  }

  return { user, service };
}

export async function confirmReceivedPortal(serviceId: string): Promise<DirectCollectionState> {
  try {
    const { user } = await assertOwnDriverService(serviceId);

    await confirmDirectCollectionReceived(serviceId);

    await logAudit({
      actorId: user.id,
      action: "recebimento_direto_confirmado_pelo_motorista",
      entityType: "service",
      entityId: serviceId,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Falha ao confirmar recebimento." };
  }

  revalidatePath("/portal/motorista");
  return { error: null };
}

export async function confirmNotReceivedPortal(
  serviceId: string,
  reasonId: string,
): Promise<DirectCollectionState> {
  if (!reasonId) {
    return { error: "Selecione o motivo." };
  }

  try {
    const { user } = await assertOwnDriverService(serviceId);

    await confirmDirectCollectionNotReceived(serviceId, reasonId);

    await logAudit({
      actorId: user.id,
      action: "recebimento_direto_nao_confirmado_pelo_motorista",
      entityType: "service",
      entityId: serviceId,
      metadata: { reasonId },
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Falha ao registrar." };
  }

  revalidatePath("/portal/motorista");
  return { error: null };
}
