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
import { alertChangeRequestNeedsReview } from "@/lib/alerts/detectors";

export type DirectCollectionState = { error: string | null };

async function assertOwnSupplierService(serviceId: string) {
  const user = await getCurrentUser();
  if (!user || !user.linked_company_id) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  const service = await prisma.service.findUniqueOrThrow({ where: { id: serviceId } });
  if (service.supplier_id !== user.linked_company_id) {
    throw new Error("Você não tem permissão para confirmar o recebimento deste serviço.");
  }

  return { user, service };
}

export async function confirmReceivedPortalEmpresa(serviceId: string): Promise<DirectCollectionState> {
  try {
    const { user } = await assertOwnSupplierService(serviceId);

    await confirmDirectCollectionReceived(serviceId);

    await logAudit({
      actorId: user.id,
      action: "recebimento_direto_confirmado_pelo_fornecedor",
      entityType: "service",
      entityId: serviceId,
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Falha ao confirmar recebimento." };
  }

  revalidatePath("/portal/empresa");
  return { error: null };
}

export async function confirmNotReceivedPortalEmpresa(
  serviceId: string,
  reasonId: string,
): Promise<DirectCollectionState> {
  if (!reasonId) {
    return { error: "Selecione o motivo." };
  }

  try {
    const { user } = await assertOwnSupplierService(serviceId);

    await confirmDirectCollectionNotReceived(serviceId, reasonId);

    await logAudit({
      actorId: user.id,
      action: "recebimento_direto_nao_confirmado_pelo_fornecedor",
      entityType: "service",
      entityId: serviceId,
      metadata: { reasonId },
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Falha ao registrar." };
  }

  revalidatePath("/portal/empresa");
  return { error: null };
}

const driverRegistrationSchema = z.object({
  name: z.string().min(1, "Informe o nome."),
  document: z.string().optional(),
  email: z.string().email("E-mail inválido.").optional().or(z.literal("")),
  phone: z.string().optional(),
  is_company_owner_driver: z.enum(["on"]).optional(),
});

export type DriverRegistrationState = { error: string | null };

// Requisito adicional pós-Fase 1 (item 6 do spec original): o fornecedor
// pode cadastrar motoristas pelo próprio portal — nascem sempre
// terceirizados, vinculados à empresa que está logada, e pendentes de
// aprovação do admin (created_from_portal=true). payment_type/comissão/
// diária/salário não aparecem aqui: são termos financeiros que só fazem
// sentido para frota própria (Nativos) ou para o dono-motorista — a
// relação financeira de um terceirizado comum é com a empresa, não com
// ele individualmente (spec seção 6).
export async function registerDriverPortal(
  _prevState: DriverRegistrationState,
  formData: FormData,
): Promise<DriverRegistrationState> {
  const user = await getCurrentUser();
  if (!user || !user.linked_company_id) {
    return { error: "Sessão expirada. Faça login novamente." };
  }

  const parsed = driverRegistrationSchema.safeParse({
    name: formData.get("name"),
    document: formData.get("document") || undefined,
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    is_company_owner_driver: formData.get("is_company_owner_driver") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const d = parsed.data;

  const driver = await prisma.driver.create({
    data: {
      name: d.name,
      document: d.document || null,
      email: d.email || null,
      phone: d.phone || null,
      owner_type: "terceirizado",
      supplier_id: user.linked_company_id,
      is_company_owner_driver: d.is_company_owner_driver === "on",
      payment_type: "diaria",
      created_from_portal: true,
    },
  });

  await logAudit({
    actorId: user.id,
    action: "motorista_cadastrado_pelo_portal",
    entityType: "driver",
    entityId: driver.id,
  });

  revalidatePath("/portal/empresa");
  return { error: null };
}

const vehicleRegistrationSchema = z.object({
  plate: z.string().min(1, "Informe a placa."),
  model: z.string().min(1, "Informe o modelo."),
  category_id: z.string().uuid().optional().or(z.literal("")),
  capacity: z
    .string()
    .min(1, "Informe a capacidade.")
    .refine((v) => Number.isInteger(Number(v)) && Number(v) > 0, "Capacidade inválida."),
});

export type VehicleRegistrationState = { error: string | null };

export async function registerVehiclePortal(
  _prevState: VehicleRegistrationState,
  formData: FormData,
): Promise<VehicleRegistrationState> {
  const user = await getCurrentUser();
  if (!user || !user.linked_company_id) {
    return { error: "Sessão expirada. Faça login novamente." };
  }

  const parsed = vehicleRegistrationSchema.safeParse({
    plate: formData.get("plate"),
    model: formData.get("model"),
    category_id: formData.get("category_id") || undefined,
    capacity: formData.get("capacity"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const d = parsed.data;

  const vehicle = await prisma.vehicle.create({
    data: {
      plate: d.plate.toUpperCase(),
      model: d.model,
      category_id: d.category_id || null,
      capacity: Number(d.capacity),
      owner_type: "terceirizado",
      supplier_id: user.linked_company_id,
      created_from_portal: true,
    },
  });

  await logAudit({
    actorId: user.id,
    action: "veiculo_cadastrado_pelo_portal",
    entityType: "vehicle",
    entityId: vehicle.id,
  });

  revalidatePath("/portal/empresa");
  return { error: null };
}

export type ChangeRequestFormState = { error: string | null };

const novaReservaSchema = z.object({
  dedupe_key: z.string().min(1),
  cliente_nome: z.string().min(1, "Informe o nome do cliente."),
  descricao: z.string().min(1, "Descreva a reserva desejada."),
});

// Requisito adicional pós-Fase 1 (item 1 do spec original): o parceiro
// pede uma nova reserva pelo portal — não é a reserva já pronta (isso o
// admin monta em /admin/reservas/novo depois de revisar o pedido), é o
// protocolo de solicitação (spec seção 7).
export async function submitNovaReservaRequest(
  _prevState: ChangeRequestFormState,
  formData: FormData,
): Promise<ChangeRequestFormState> {
  const user = await getCurrentUser();
  if (!user || !user.linked_company_id || !user.linked_company?.roles.includes("parceiro")) {
    return { error: "Sessão expirada. Faça login novamente." };
  }

  const parsed = novaReservaSchema.safeParse({
    dedupe_key: formData.get("dedupe_key"),
    cliente_nome: formData.get("cliente_nome"),
    descricao: formData.get("descricao"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const changeRequest = await submitChangeRequest({
    type: "nova_reserva",
    requesterType: "company",
    requesterId: user.linked_company_id,
    companyId: user.linked_company_id,
    allocationDetails: { cliente_nome: parsed.data.cliente_nome, descricao: parsed.data.descricao },
    dedupeKey: parsed.data.dedupe_key,
  });

  await logAudit({
    actorId: user.id,
    action: "solicitacao_nova_reserva_criada",
    entityType: "change_request",
    entityId: changeRequest.id,
  });

  revalidatePath("/portal/empresa");
  return { error: null };
}

const alteracaoSchema = z.object({
  dedupe_key: z.string().min(1),
  reservation_id: z.string().uuid("Selecione a reserva."),
  descricao: z.string().min(1, "Descreva a alteração desejada."),
});

export async function submitAlteracaoRequest(
  _prevState: ChangeRequestFormState,
  formData: FormData,
): Promise<ChangeRequestFormState> {
  const user = await getCurrentUser();
  if (!user || !user.linked_company_id) {
    return { error: "Sessão expirada. Faça login novamente." };
  }

  const parsed = alteracaoSchema.safeParse({
    dedupe_key: formData.get("dedupe_key"),
    reservation_id: formData.get("reservation_id"),
    descricao: formData.get("descricao"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const reservation = await prisma.reservation.findUnique({ where: { id: parsed.data.reservation_id } });
  if (!reservation || reservation.origin_partner_id !== user.linked_company_id) {
    return { error: "Reserva não encontrada." };
  }

  const changeRequest = await submitChangeRequest({
    type: "alteracao",
    requesterType: "company",
    requesterId: user.linked_company_id,
    companyId: user.linked_company_id,
    reservationId: reservation.id,
    allocationDetails: { descricao: parsed.data.descricao },
    dedupeKey: parsed.data.dedupe_key,
  });

  await alertChangeRequestNeedsReview({
    changeRequestId: changeRequest.id,
    protocol: changeRequest.protocol,
    type: "alteracao",
  });

  await logAudit({
    actorId: user.id,
    action: "solicitacao_alteracao_criada",
    entityType: "change_request",
    entityId: changeRequest.id,
  });

  revalidatePath("/portal/empresa");
  return { error: null };
}

const cancelamentoSchema = z.object({
  dedupe_key: z.string().min(1),
  reservation_id: z.string().uuid("Selecione a reserva."),
  motivo: z.string().min(1, "Informe o motivo do cancelamento."),
});

export async function submitCancelamentoRequest(
  _prevState: ChangeRequestFormState,
  formData: FormData,
): Promise<ChangeRequestFormState> {
  const user = await getCurrentUser();
  if (!user || !user.linked_company_id) {
    return { error: "Sessão expirada. Faça login novamente." };
  }

  const parsed = cancelamentoSchema.safeParse({
    dedupe_key: formData.get("dedupe_key"),
    reservation_id: formData.get("reservation_id"),
    motivo: formData.get("motivo"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const reservation = await prisma.reservation.findUnique({ where: { id: parsed.data.reservation_id } });
  if (!reservation || reservation.origin_partner_id !== user.linked_company_id) {
    return { error: "Reserva não encontrada." };
  }

  const changeRequest = await submitChangeRequest({
    type: "cancelamento",
    requesterType: "company",
    requesterId: user.linked_company_id,
    companyId: user.linked_company_id,
    reservationId: reservation.id,
    allocationDetails: { motivo: parsed.data.motivo },
    dedupeKey: parsed.data.dedupe_key,
  });

  await alertChangeRequestNeedsReview({
    changeRequestId: changeRequest.id,
    protocol: changeRequest.protocol,
    type: "cancelamento",
  });

  await logAudit({
    actorId: user.id,
    action: "solicitacao_cancelamento_criada",
    entityType: "change_request",
    entityId: changeRequest.id,
  });

  revalidatePath("/portal/empresa");
  return { error: null };
}

const repasseSchema = z.object({
  dedupe_key: z.string().min(1),
  entry_ids: z.array(z.string().uuid()).optional(),
  nota: z.string().optional(),
});

export async function submitRepasseRequestEmpresa(
  _prevState: ChangeRequestFormState,
  formData: FormData,
): Promise<ChangeRequestFormState> {
  const user = await getCurrentUser();
  if (!user || !user.linked_company_id) {
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
    requesterType: "company",
    requesterId: user.linked_company_id,
    companyId: user.linked_company_id,
    allocationDetails: { entry_ids: parsed.data.entry_ids ?? [], nota: parsed.data.nota ?? null },
    dedupeKey: parsed.data.dedupe_key,
  });

  await logAudit({
    actorId: user.id,
    action: "solicitacao_repasse_criada",
    entityType: "change_request",
    entityId: changeRequest.id,
  });

  revalidatePath("/portal/empresa");
  return { error: null };
}
