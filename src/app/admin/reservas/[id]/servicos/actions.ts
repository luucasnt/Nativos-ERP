"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInternalUser } from "@/lib/auth/get-current-user";
import { logAudit } from "@/lib/audit";
import { computeCollectionActor, computeServicePrice } from "@/lib/reservations/pricing";
import { recalculateReservationStatus } from "@/lib/reservations/status";
import { recalculateReservationTax } from "@/lib/reservations/tax";
import { acceptService, rejectService } from "@/lib/reservations/acceptance";
import { generateServiceFinanceEntries, cancelServiceFinanceEntries } from "@/lib/finance/settlement";
import { recalculateReservationCommissions } from "@/lib/finance/commissions";
import { notifyCompanyPortalUsers, notifyDriverPortalUser } from "@/lib/notifications";
import { checkPartnerBillingLimit, detectDriverVehicleConflict } from "@/lib/alerts/detectors";

const decimalField = z
  .string()
  .optional()
  .transform((v) => (v ? v.trim() : ""))
  .refine((v) => v === "" || !Number.isNaN(Number(v)), "Valor numérico inválido.");

const intField = z
  .string()
  .optional()
  .transform((v) => (v ? v.trim() : ""))
  .refine((v) => v === "" || Number.isInteger(Number(v)), "Valor inteiro inválido.");

const baseServiceFields = {
  type: z.enum([
    "transfer_chegada",
    "transfer_saida",
    "transfer_interno",
    "disposicao",
    "passeio",
    "concierge",
    "carrinho_golfe",
  ]),
  execution_type: z.enum(["propria", "fornecedor"]),
  supplier_id: z.string().uuid().optional().or(z.literal("")),
  driver_id: z.string().uuid().optional().or(z.literal("")),
  vehicle_id: z.string().uuid().optional().or(z.literal("")),
  scheduled_date: z.string().optional(),
  scheduled_time: z.string().optional(),
  pickup_location: z.string().optional(),
  dropoff_location: z.string().optional(),
  passenger_count: intField,
  flight_number: z.string().optional(),
  notes: z.string().optional(),
  pacote_disposicao_id: z.string().uuid().optional().or(z.literal("")),
  km_incluido: decimalField,
  valor_hora_extra: decimalField,
  valor_km_extra: decimalField,
  supplier_cost: decimalField,
  discount_type: z.enum(["nenhum", "percentual", "fixo"]),
  discount_value: decimalField,
  discount_reason: z.string().optional(),
  luggage_10kg: intField,
  luggage_23kg: intField,
  luggage_32kg: intField,
  bebe_conforto: intField,
  cadeirinha: intField,
  booster: intField,
  driver_can_receive_payment: z.enum(["on"]).optional(),
  reception_sign_enabled: z.enum(["on"]).optional(),
  reception_passenger_name: z.string().optional(),
  os_show_price: z.enum(["herda", "sim", "nao"]),
};

const createServiceSchema = z.object({
  ...baseServiceFields,
  original_price: z
    .string()
    .min(1, "Informe o valor do serviço.")
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, "Valor inválido."),
});

const updateServiceSchema = z.object(baseServiceFields);

export type ServiceFormState = { error: string | null };

function toIntOrNull(value: string) {
  return value === "" ? null : Number(value);
}

function toDecimalOrNull(value: string) {
  return value === "" ? null : value;
}

function readBaseFields(formData: FormData) {
  return {
    type: formData.get("type"),
    execution_type: formData.get("execution_type"),
    supplier_id: formData.get("supplier_id") || undefined,
    driver_id: formData.get("driver_id") || undefined,
    vehicle_id: formData.get("vehicle_id") || undefined,
    scheduled_date: formData.get("scheduled_date") || undefined,
    scheduled_time: formData.get("scheduled_time") || undefined,
    pickup_location: formData.get("pickup_location") || undefined,
    dropoff_location: formData.get("dropoff_location") || undefined,
    passenger_count: formData.get("passenger_count") || undefined,
    flight_number: formData.get("flight_number") || undefined,
    notes: formData.get("notes") || undefined,
    pacote_disposicao_id: formData.get("pacote_disposicao_id") || undefined,
    km_incluido: formData.get("km_incluido") || undefined,
    valor_hora_extra: formData.get("valor_hora_extra") || undefined,
    valor_km_extra: formData.get("valor_km_extra") || undefined,
    supplier_cost: formData.get("supplier_cost") || undefined,
    discount_type: formData.get("discount_type") || "nenhum",
    discount_value: formData.get("discount_value") || undefined,
    discount_reason: formData.get("discount_reason") || undefined,
    luggage_10kg: formData.get("luggage_10kg") || undefined,
    luggage_23kg: formData.get("luggage_23kg") || undefined,
    luggage_32kg: formData.get("luggage_32kg") || undefined,
    bebe_conforto: formData.get("bebe_conforto") || undefined,
    cadeirinha: formData.get("cadeirinha") || undefined,
    booster: formData.get("booster") || undefined,
    driver_can_receive_payment: formData.get("driver_can_receive_payment") || undefined,
    reception_sign_enabled: formData.get("reception_sign_enabled") || undefined,
    reception_passenger_name: formData.get("reception_passenger_name") || undefined,
    os_show_price: formData.get("os_show_price") || "herda",
  };
}

function mapCommonData(d: z.infer<typeof updateServiceSchema>) {
  if (d.execution_type === "fornecedor" && !d.supplier_id) {
    return { ok: false as const, error: "Selecione o fornecedor que executa este serviço." };
  }

  return {
    ok: true as const,
    data: {
      type: d.type,
      execution_type: d.execution_type,
      supplier_id: d.execution_type === "fornecedor" ? d.supplier_id || null : null,
      driver_id: d.driver_id || null,
      vehicle_id: d.vehicle_id || null,
      scheduled_date: d.scheduled_date ? new Date(d.scheduled_date) : null,
      scheduled_time: d.scheduled_time || null,
      pickup_location: d.pickup_location || null,
      dropoff_location: d.dropoff_location || null,
      passenger_count: toIntOrNull(d.passenger_count),
      flight_number: d.flight_number || null,
      notes: d.notes || null,
      pacote_disposicao_id: d.type === "disposicao" ? d.pacote_disposicao_id || null : null,
      km_incluido: d.type === "disposicao" ? toDecimalOrNull(d.km_incluido) : null,
      valor_hora_extra: d.type === "disposicao" ? toDecimalOrNull(d.valor_hora_extra) : null,
      valor_km_extra: d.type === "disposicao" ? toDecimalOrNull(d.valor_km_extra) : null,
      supplier_cost: d.execution_type === "fornecedor" ? toDecimalOrNull(d.supplier_cost) : null,
      discount_type: d.discount_type,
      discount_value: toDecimalOrNull(d.discount_value),
      discount_reason: d.discount_type !== "nenhum" ? d.discount_reason || null : null,
      luggage_10kg: toIntOrNull(d.luggage_10kg) ?? 0,
      luggage_23kg: toIntOrNull(d.luggage_23kg) ?? 0,
      luggage_32kg: toIntOrNull(d.luggage_32kg) ?? 0,
      bebe_conforto: toIntOrNull(d.bebe_conforto) ?? 0,
      cadeirinha: toIntOrNull(d.cadeirinha) ?? 0,
      booster: toIntOrNull(d.booster) ?? 0,
      driver_can_receive_payment: d.driver_can_receive_payment === "on",
      reception_sign_enabled: d.reception_sign_enabled === "on",
      reception_passenger_name: d.reception_sign_enabled === "on" ? d.reception_passenger_name || null : null,
      os_show_price: d.os_show_price === "herda" ? null : d.os_show_price === "sim",
    },
  };
}

async function afterServiceMutation(reservationId: string, serviceId: string) {
  const service = await prisma.service.findUniqueOrThrow({ where: { id: serviceId } });

  if (service.execution_status === "cancelado" || service.acceptance_status === "recusado") {
    await cancelServiceFinanceEntries(serviceId);
  } else if (service.acceptance_status === "aceito") {
    await generateServiceFinanceEntries(serviceId);
  }

  await detectDriverVehicleConflict(serviceId);

  await recalculateReservationStatus(reservationId);
  await recalculateReservationTax(reservationId);
  await recalculateReservationCommissions(reservationId);

  const reservation = await prisma.reservation.findUniqueOrThrow({ where: { id: reservationId } });
  if (reservation.origin_partner_id) {
    await checkPartnerBillingLimit(reservation.origin_partner_id);
  }
}

export async function createService(
  reservationId: string,
  _prevState: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  const user = await requireInternalUser();

  const parsed = createServiceSchema.safeParse({
    ...readBaseFields(formData),
    original_price: formData.get("original_price"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const common = mapCommonData(parsed.data);
  if (!common.ok) {
    return { error: common.error };
  }

  const reservation = await prisma.reservation.findUniqueOrThrow({
    where: { id: reservationId },
  });

  const price = computeServicePrice(
    parsed.data.original_price,
    common.data.discount_type,
    common.data.discount_value,
  );

  const service = await prisma.service.create({
    data: {
      ...common.data,
      reservation_id: reservationId,
      original_price: parsed.data.original_price,
      price,
      collection_actor: computeCollectionActor(reservation.collection_mode, common.data.execution_type),
      acceptance_status: common.data.execution_type === "propria" ? "aceito" : "aguardando_aceite",
    },
  });

  await afterServiceMutation(reservationId, service.id);

  if (service.acceptance_status === "aguardando_aceite" && service.supplier_id) {
    await notifyCompanyPortalUsers({
      companyId: service.supplier_id,
      type: "novo_servico",
      message: `Novo serviço aguardando sua confirmação: ${service.type}.`,
      entityRefType: "service",
      entityRefId: service.id,
    });
  }
  if (service.driver_id) {
    await notifyDriverPortalUser({
      driverId: service.driver_id,
      type: "servico_atribuido",
      message: `Você foi atribuído a um novo serviço: ${service.type}.`,
      entityRefType: "service",
      entityRefId: service.id,
    });
  }

  await logAudit({
    actorId: user.id,
    action: "servico_criado",
    entityType: "service",
    entityId: service.id,
  });

  revalidatePath(`/admin/reservas/${reservationId}`);
  redirect(`/admin/reservas/${reservationId}`);
}

export async function updateService(
  reservationId: string,
  serviceId: string,
  _prevState: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  const user = await requireInternalUser();

  const parsed = updateServiceSchema.safeParse(readBaseFields(formData));

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const common = mapCommonData(parsed.data);
  if (!common.ok) {
    return { error: common.error };
  }

  const [reservation, existing] = await Promise.all([
    prisma.reservation.findUniqueOrThrow({ where: { id: reservationId } }),
    prisma.service.findUniqueOrThrow({ where: { id: serviceId } }),
  ]);

  // original_price nunca é editado manualmente depois de definido (spec
  // seção 5) — só o desconto muda o `price` final.
  const price = computeServicePrice(
    existing.original_price,
    common.data.discount_type,
    common.data.discount_value,
  );

  const executionOrSupplierChanged =
    common.data.execution_type !== existing.execution_type ||
    common.data.supplier_id !== existing.supplier_id;

  await prisma.service.update({
    where: { id: serviceId },
    data: {
      ...common.data,
      price,
      collection_actor: computeCollectionActor(reservation.collection_mode, common.data.execution_type),
      // Troca de fornecedor/modalidade reabre o fluxo de aceite; serviço
      // próprio não precisa de aceite de terceiro.
      ...(executionOrSupplierChanged
        ? {
            acceptance_status: common.data.execution_type === "propria" ? "aceito" : "aguardando_aceite",
            acceptance_reason: null,
          }
        : {}),
    },
  });

  await afterServiceMutation(reservationId, serviceId);

  if (common.data.supplier_id && executionOrSupplierChanged) {
    await notifyCompanyPortalUsers({
      companyId: common.data.supplier_id,
      type: "novo_servico",
      message: `Novo serviço aguardando sua confirmação: ${common.data.type}.`,
      entityRefType: "service",
      entityRefId: serviceId,
    });
  }
  if (common.data.driver_id && common.data.driver_id !== existing.driver_id) {
    await notifyDriverPortalUser({
      driverId: common.data.driver_id,
      type: "servico_atribuido",
      message: `Você foi atribuído a um serviço: ${common.data.type}.`,
      entityRefType: "service",
      entityRefId: serviceId,
    });
  }

  await logAudit({
    actorId: user.id,
    action: "servico_atualizado",
    entityType: "service",
    entityId: serviceId,
    metadata: executionOrSupplierChanged ? { troca_fornecedor_ou_modalidade: true } : undefined,
  });

  revalidatePath(`/admin/reservas/${reservationId}`);
  redirect(`/admin/reservas/${reservationId}`);
}

export async function cancelService(reservationId: string, serviceId: string) {
  const user = await requireInternalUser();

  await prisma.service.update({
    where: { id: serviceId },
    data: { execution_status: "cancelado" },
  });

  await afterServiceMutation(reservationId, serviceId);

  await logAudit({
    actorId: user.id,
    action: "servico_cancelado",
    entityType: "service",
    entityId: serviceId,
  });

  revalidatePath(`/admin/reservas/${reservationId}`);
}

export async function acceptServiceInternal(reservationId: string, serviceId: string) {
  const user = await requireInternalUser();

  await acceptService(serviceId);

  await logAudit({
    actorId: user.id,
    action: "servico_aceite_registrado_internamente",
    entityType: "service",
    entityId: serviceId,
  });

  revalidatePath(`/admin/reservas/${reservationId}`);
}

export async function rejectServiceInternal(
  reservationId: string,
  serviceId: string,
  reason: string,
) {
  const user = await requireInternalUser();

  await rejectService(serviceId, reason);

  await logAudit({
    actorId: user.id,
    action: "servico_recusa_registrada_internamente",
    entityType: "service",
    entityId: serviceId,
    metadata: { reason },
  });

  revalidatePath(`/admin/reservas/${reservationId}`);
}
