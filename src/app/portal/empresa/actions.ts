"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertActiveCompanyPortalUser } from "@/lib/auth/get-current-user";
import { logAudit } from "@/lib/audit";
import {
  confirmDirectCollectionNotReceived,
  confirmDirectCollectionReceived,
  ensureDirectSupplierRepasseRequest,
} from "@/lib/finance/direct-collection";
import { submitChangeRequest } from "@/lib/change-requests/submit";
import { alertChangeRequestNeedsReview } from "@/lib/alerts/detectors";

export type DirectCollectionState = { error: string | null };

async function assertOwnSupplierService(serviceId: string) {
  const user = await assertActiveCompanyPortalUser();
  if (!user.linked_company.roles.includes("fornecedor")) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  const service = await prisma.service.findUniqueOrThrow({
    where: { id: serviceId },
    select: { supplier_id: true, execution_status: true, collection_actor: true },
  });
  if (service.supplier_id !== user.linked_company_id) {
    throw new Error("Você não tem permissão para confirmar o recebimento deste serviço.");
  }
  if (service.execution_status !== "concluido" || service.collection_actor !== "fornecedor") {
    throw new Error("O recebimento só pode ser confirmado após concluir um serviço de cobrança direta.");
  }

  return { user, service };
}

export async function confirmReceivedPortalEmpresa(serviceId: string, receiptUrl: string): Promise<DirectCollectionState> {
  try {
    const { user } = await assertOwnSupplierService(serviceId);
    const proof = z.string().url("Anexe um comprovante válido.").parse(receiptUrl);

    await confirmDirectCollectionReceived(serviceId, proof);
    await ensureDirectSupplierRepasseRequest(serviceId, user.linked_company_id);

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
  const user = await assertActiveCompanyPortalUser();
  if (!user.linked_company.roles.includes("fornecedor")) {
    return { error: "Apenas fornecedores podem cadastrar motoristas." };
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
  const user = await assertActiveCompanyPortalUser();
  if (!user.linked_company.roles.includes("fornecedor")) {
    return { error: "Apenas fornecedores podem cadastrar veículos." };
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

  const category = d.category_id
    ? await prisma.catalogItem.findFirst({
        where: { id: d.category_id, type: "tipo_veiculo", active: true },
        select: { id: true },
      })
    : null;
  if (d.category_id && !category) return { error: "Categoria de veículo inválida ou inativa." };

  const vehicle = await prisma.vehicle.create({
    data: {
      plate: d.plate.toUpperCase(),
      model: d.model,
      category_id: category?.id ?? null,
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
  client_id: z.string().uuid().optional().or(z.literal("")),
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
  const user = await assertActiveCompanyPortalUser();
  if (!user.linked_company.roles.includes("parceiro")) {
    return { error: "Sessão expirada. Faça login novamente." };
  }

  const parsed = novaReservaSchema.safeParse({
    dedupe_key: formData.get("dedupe_key"),
    cliente_nome: formData.get("cliente_nome"),
    client_id: formData.get("client_id") || undefined,
    descricao: formData.get("descricao"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  if (parsed.data.client_id) {
    const client = await prisma.client.findFirst({
      where: { id: parsed.data.client_id, origin_partner_id: user.linked_company_id },
      select: { id: true, name: true },
    });
    if (!client) return { error: "Cliente não encontrado no seu cadastro." };
  }

  const changeRequest = await submitChangeRequest({
    type: "nova_reserva",
    requesterType: "company",
    requesterId: user.linked_company_id,
    companyId: user.linked_company_id,
    allocationDetails: {
      cliente_nome: parsed.data.cliente_nome,
      client_id: parsed.data.client_id || null,
      descricao: parsed.data.descricao,
    },
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

const clientSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do cliente."),
  document: z.string().trim().optional(),
  email: z.string().email("E-mail inválido.").optional().or(z.literal("")),
  phone: z.string().trim().optional(),
});

export async function registerClientPortal(
  _prevState: ChangeRequestFormState,
  formData: FormData,
): Promise<ChangeRequestFormState> {
  const user = await assertActiveCompanyPortalUser();
  if (!user.linked_company.roles.includes("parceiro")) {
    return { error: "Apenas parceiros podem cadastrar clientes." };
  }
  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    document: formData.get("document") || undefined,
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const duplicate = await prisma.client.findFirst({
    where: {
      origin_partner_id: user.linked_company_id,
      OR: [
        parsed.data.document ? { document: parsed.data.document } : undefined,
        parsed.data.email ? { email: parsed.data.email } : undefined,
      ].filter((item): item is NonNullable<typeof item> => Boolean(item)),
    },
  });
  if (duplicate) return { error: "Já existe um cliente com este documento ou e-mail." };

  await prisma.client.create({
    data: {
      name: parsed.data.name,
      document: parsed.data.document || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      origin: "parceiro",
      origin_partner_id: user.linked_company_id,
    },
  });
  revalidatePath("/portal/empresa");
  return { error: null };
}

const advanceInvoiceSchema = z.object({
  dedupe_key: z.string().min(1),
  billing_cycle_id: z.string().uuid(),
  amount: z.string().min(1).refine((value) => Number(value) > 0, "Informe um valor válido."),
  nota: z.string().trim().min(5, "Explique o pedido de antecipação."),
});

const invoicePaymentSchema = z.object({
  dedupe_key: z.string().min(1),
  billing_cycle_id: z.string().uuid(),
  amount: z.string().min(1).refine((value) => Number(value) > 0, "Informe um valor válido."),
  receipt_url: z.string().url("Anexe um comprovante válido."),
  nota: z.string().trim().max(300).optional(),
});

export async function submitInvoicePaymentRequest(
  _prevState: ChangeRequestFormState,
  formData: FormData,
): Promise<ChangeRequestFormState> {
  const user = await assertActiveCompanyPortalUser();
  if (!user.linked_company.roles.includes("parceiro")) return { error: "Apenas parceiros podem informar pagamento de fatura." };
  const parsed = invoicePaymentSchema.safeParse({
    dedupe_key: formData.get("dedupe_key"), billing_cycle_id: formData.get("billing_cycle_id"),
    amount: formData.get("amount"), receipt_url: formData.get("receipt_url"), nota: formData.get("nota") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const cycle = await prisma.billingCycle.findFirst({ where: { id: parsed.data.billing_cycle_id, company_id: user.linked_company_id, status: { in: ["fechado", "faturado", "parcialmente_pago", "vencido"] } }, include: { reservations: { select: { reservation_id: true } } } });
  if (!cycle) return { error: "Fatura não encontrada ou não disponível para pagamento." };
  const remaining = Number(cycle.total_amount) - Number(cycle.paid_amount);
  if (Number(parsed.data.amount) > remaining) return { error: "O valor excede o saldo da fatura." };
  await submitChangeRequest({
    type: "pagamento_fatura", requesterType: "company", requesterId: user.linked_company_id,
    companyId: user.linked_company_id, allocationDetails: {
      billing_cycle_id: cycle.id, reservation_ids: cycle.reservations.map((item) => item.reservation_id),
      amount: Number(parsed.data.amount), receipt_url: parsed.data.receipt_url, nota: parsed.data.nota ?? null,
    }, dedupeKey: parsed.data.dedupe_key,
  });
  revalidatePath("/portal/empresa/financeiro"); revalidatePath("/portal/empresa/solicitacoes");
  return { error: null };
}

export async function submitInvoiceAdvanceRequest(
  _prevState: ChangeRequestFormState,
  formData: FormData,
): Promise<ChangeRequestFormState> {
  const user = await assertActiveCompanyPortalUser();
  if (!user.linked_company.roles.includes("parceiro")) {
    return { error: "Apenas parceiros podem solicitar antecipação." };
  }
  const parsed = advanceInvoiceSchema.safeParse({
    dedupe_key: formData.get("dedupe_key"),
    billing_cycle_id: formData.get("billing_cycle_id"),
    amount: formData.get("amount"),
    nota: formData.get("nota"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const cycle = await prisma.billingCycle.findFirst({
    where: {
      id: parsed.data.billing_cycle_id,
      company_id: user.linked_company_id,
      status: { in: ["aberto", "fechado", "parcialmente_pago", "vencido"] },
    },
  });
  if (!cycle) return { error: "Fatura não encontrada ou não elegível para antecipação." };
  const remaining = Number(cycle.total_amount) - Number(cycle.paid_amount);
  if (Number(parsed.data.amount) > remaining) return { error: "O valor excede o saldo da fatura." };
  await submitChangeRequest({
    type: "antecipacao_fatura",
    requesterType: "company",
    requesterId: user.linked_company_id,
    companyId: user.linked_company_id,
    allocationDetails: {
      billing_cycle_id: cycle.id,
      amount: Number(parsed.data.amount),
      nota: parsed.data.nota,
    },
    dedupeKey: parsed.data.dedupe_key,
  });
  revalidatePath("/portal/empresa/financeiro");
  revalidatePath("/portal/empresa/solicitacoes");
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
  const user = await assertActiveCompanyPortalUser();
  if (!user.linked_company.roles.includes("parceiro")) {
    return { error: "Apenas parceiros podem solicitar alterações de reserva." };
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
  const user = await assertActiveCompanyPortalUser();
  if (!user.linked_company.roles.includes("parceiro")) {
    return { error: "Apenas parceiros podem solicitar cancelamentos." };
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
  entry_ids: z.array(z.string().uuid()).min(1, "Selecione ao menos um lançamento."),
  nota: z.string().optional(),
});

export async function submitRepasseRequestEmpresa(
  _prevState: ChangeRequestFormState,
  formData: FormData,
): Promise<ChangeRequestFormState> {
  const user = await assertActiveCompanyPortalUser();
  if (!user.linked_company.roles.includes("fornecedor")) {
    return { error: "Apenas fornecedores podem solicitar repasse." };
  }

  const parsed = repasseSchema.safeParse({
    dedupe_key: formData.get("dedupe_key"),
    entry_ids: formData.getAll("entry_ids"),
    nota: formData.get("nota") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const entryIds = [...new Set(parsed.data.entry_ids)];
  const eligibleCount = await prisma.financeEntry.count({
    where: {
      id: { in: entryIds },
      party_type: "fornecedor",
      party_id: user.linked_company_id,
      type: "despesa",
      status: "pendente",
      payment_eligible: true,
      reversed_at: null,
    },
  });
  if (eligibleCount !== entryIds.length) {
    return { error: "Um ou mais lançamentos não pertencem à sua conta ou não estão elegíveis." };
  }

  const changeRequest = await submitChangeRequest({
    type: "repasse_nativos",
    requesterType: "company",
    requesterId: user.linked_company_id,
    companyId: user.linked_company_id,
    allocationDetails: { entry_ids: entryIds, nota: parsed.data.nota ?? null },
    dedupeKey: parsed.data.dedupe_key,
  });

  await logAudit({
    actorId: user.id,
    action: "solicitacao_repasse_criada",
    entityType: "change_request",
    entityId: changeRequest.id,
  });

  revalidatePath("/portal/empresa/financeiro");
  revalidatePath("/portal/empresa/solicitacoes");
  return { error: null };
}
