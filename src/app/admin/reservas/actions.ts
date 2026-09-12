"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInternalUser } from "@/lib/auth/get-current-user";
import { logAudit } from "@/lib/audit";
import { generateNextReservationCode } from "@/lib/reservations/code";
import { recalculateReservationTax } from "@/lib/reservations/tax";
import { generateServiceFinanceEntries } from "@/lib/finance/settlement";
import { recalculateReservationCommissions } from "@/lib/finance/commissions";

// Campos da reserva (collection_mode, is_cortesia, origin_partner) entram
// na fórmula de liquidação de cada serviço — mudar algum deles exige
// recalcular os lançamentos "programado" de todo serviço já comprometido
// (aceito, não cancelado) desta reserva.
async function regenerateAcceptedServiceEntries(reservationId: string) {
  const services = await prisma.service.findMany({
    where: { reservation_id: reservationId, acceptance_status: "aceito", execution_status: { not: "cancelado" } },
    select: { id: true },
  });

  for (const service of services) {
    await generateServiceFinanceEntries(service.id);
  }
}

const reservationSchema = z.object({
  client_id: z.string().uuid("Selecione o cliente."),
  origin_partner_id: z.string().uuid().optional().or(z.literal("")),
  referrer_type: z.enum(["company", "driver", "client", "pessoa_fisica"]).optional().or(z.literal("")),
  referrer_id: z.string().uuid().optional().or(z.literal("")),
  referrer_name: z.string().optional(),
  referrer_document: z.string().optional(),
  commission_percent: z
    .string()
    .optional()
    .transform((v) => (v ? v.trim() : ""))
    .refine((v) => v === "" || !Number.isNaN(Number(v)), "Percentual inválido."),
  is_cortesia: z.enum(["on"]).optional(),
  is_net_fare: z.enum(["on"]).optional(),
  requires_nf: z.enum(["on"]).optional(),
  collection_mode: z.enum(["nativos", "direto", "faturado"]),
  tax_percent_override: z
    .string()
    .optional()
    .transform((v) => (v ? v.trim() : ""))
    .refine((v) => v === "" || !Number.isNaN(Number(v)), "Alíquota inválida."),
});

export type ReservationFormState = { error: string | null };

function parse(formData: FormData) {
  const parsed = reservationSchema.safeParse({
    client_id: formData.get("client_id"),
    origin_partner_id: formData.get("origin_partner_id") || undefined,
    referrer_type: formData.get("referrer_type") || undefined,
    referrer_id: formData.get("referrer_id") || undefined,
    referrer_name: formData.get("referrer_name") || undefined,
    referrer_document: formData.get("referrer_document") || undefined,
    commission_percent: formData.get("commission_percent") || undefined,
    is_cortesia: formData.get("is_cortesia") || undefined,
    is_net_fare: formData.get("is_net_fare") || undefined,
    requires_nf: formData.get("requires_nf") || undefined,
    collection_mode: formData.get("collection_mode"),
    tax_percent_override: formData.get("tax_percent_override") || undefined,
  });

  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const d = parsed.data;

  if (d.referrer_type === "pessoa_fisica" && !d.referrer_name) {
    return { ok: false as const, error: "Informe o nome do indicador (pessoa física)." };
  }

  if (d.referrer_type && d.referrer_type !== "pessoa_fisica" && !d.referrer_id) {
    return { ok: false as const, error: "Selecione o indicador." };
  }

  return {
    ok: true as const,
    data: {
      client_id: d.client_id,
      origin_partner_id: d.origin_partner_id || null,
      referrer_type: d.referrer_type || null,
      referrer_id: d.referrer_type && d.referrer_type !== "pessoa_fisica" ? d.referrer_id || null : null,
      referrer_name: d.referrer_type === "pessoa_fisica" ? d.referrer_name || null : null,
      referrer_document: d.referrer_type === "pessoa_fisica" ? d.referrer_document || null : null,
      commission_percent: d.commission_percent || null,
      is_cortesia: d.is_cortesia === "on",
      is_net_fare: d.is_net_fare === "on",
      requires_nf: d.requires_nf === "on",
      collection_mode: d.collection_mode,
      // Edição manual e direta: preencher congela imediatamente a
      // alíquota efetiva desta reserva (sobrepõe o padrão global); deixar
      // em branco remove a sobreposição (volta a depender do padrão
      // global, ou fica sem cálculo se o padrão também estiver vazio).
      tax_percent_snapshot: d.tax_percent_override === "" ? null : d.tax_percent_override,
    },
  };
}

export async function createReservation(
  _prevState: ReservationFormState,
  formData: FormData,
): Promise<ReservationFormState> {
  const user = await requireInternalUser();
  const result = parse(formData);

  if (!result.ok) {
    return { error: result.error };
  }

  const code = await generateNextReservationCode();

  const reservation = await prisma.reservation.create({
    data: { ...result.data, code },
  });

  await recalculateReservationTax(reservation.id);
  await recalculateReservationCommissions(reservation.id);

  await logAudit({
    actorId: user.id,
    action: "reserva_criada",
    entityType: "reservation",
    entityId: reservation.id,
  });

  revalidatePath("/admin/reservas");
  redirect(`/admin/reservas/${reservation.id}`);
}

export async function updateReservation(
  id: string,
  _prevState: ReservationFormState,
  formData: FormData,
): Promise<ReservationFormState> {
  const user = await requireInternalUser();
  const result = parse(formData);

  if (!result.ok) {
    return { error: result.error };
  }

  await prisma.reservation.update({ where: { id }, data: result.data });

  // Sempre recalcula: cobre requires_nf ligando/desligando, a alíquota
  // desta reserva sendo definida/limpa manualmente, ou o padrão global
  // tendo passado a existir desde o último cálculo.
  await recalculateReservationTax(id);
  await recalculateReservationCommissions(id);
  await regenerateAcceptedServiceEntries(id);

  await logAudit({
    actorId: user.id,
    action: "reserva_atualizada",
    entityType: "reservation",
    entityId: id,
  });

  revalidatePath("/admin/reservas");
  revalidatePath(`/admin/reservas/${id}`);
  redirect(`/admin/reservas/${id}`);
}
