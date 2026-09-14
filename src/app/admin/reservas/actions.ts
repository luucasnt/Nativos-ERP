"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireInternalUser } from "@/lib/auth/get-current-user";
import { logAudit } from "@/lib/audit";
import { generateNextReservationCode } from "@/lib/reservations/code";
import { recalculateReservationTax } from "@/lib/reservations/tax";
import { generateServiceFinanceEntries } from "@/lib/finance/settlement";
import { recalculateReservationCommissions } from "@/lib/finance/commissions";
import { rejectReservationEntirely as rejectReservationEntirelyLib } from "@/lib/reservations/rejection";
import { cancelReservation as cancelReservationLib } from "@/lib/reservations/cancellation";

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
    .refine((v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 100), "Informe um percentual entre 0 e 100."),
  is_cortesia: z.enum(["on"]).optional(),
  is_net_fare: z.enum(["on"]).optional(),
  requires_nf: z.enum(["on"]).optional(),
  collection_mode: z.enum(["nativos", "direto", "faturado"]),
  tax_percent_override: z
    .string()
    .optional()
    .transform((v) => (v ? v.trim() : ""))
    .refine((v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 100), "Informe uma alíquota entre 0 e 100."),
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
  if (d.collection_mode === "faturado" && !d.origin_partner_id) {
    return { ok: false as const, error: "Selecione o parceiro responsável pelo faturamento." };
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

  let reservation: Awaited<ReturnType<typeof prisma.reservation.create>> | null = null;
  for (let attempt = 0; attempt < 4 && !reservation; attempt += 1) {
    const code = await generateNextReservationCode();
    try {
      reservation = await prisma.reservation.create({ data: { ...result.data, code } });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
    }
  }
  if (!reservation) throw new Error("Não foi possível gerar um código único para a reserva. Tente novamente.");

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

  const [current, lockedEntry] = await Promise.all([
    prisma.reservation.findUniqueOrThrow({ where: { id } }),
    prisma.financeEntry.findFirst({
      where: {
        reservation_id: id,
        reversed_at: null,
        OR: [
          { status: { in: ["pendente", "vencido", "pago"] } },
          { payments: { some: { reversed_at: null, estorno_of_id: null } } },
        ],
      },
      select: { id: true },
    }),
  ]);
  const changedFinancialRule =
    current.client_id !== result.data.client_id ||
    current.origin_partner_id !== result.data.origin_partner_id ||
    current.collection_mode !== result.data.collection_mode ||
    current.is_cortesia !== result.data.is_cortesia ||
    current.is_net_fare !== result.data.is_net_fare ||
    current.requires_nf !== result.data.requires_nf ||
    (current.commission_percent?.toString() ?? null) !== result.data.commission_percent ||
    (current.tax_percent_snapshot?.toString() ?? null) !== result.data.tax_percent_snapshot;
  if (lockedEntry && changedFinancialRule) {
    return {
      error: "A reserva possui títulos financeiros elegíveis ou pagos. Faça um ajuste/estorno antes de alterar cliente, cobrança, comissão, imposto ou cortesia.",
    };
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

export async function rejectReservationEntirely(reservationId: string, reason: string) {
  const user = await requireInternalUser();

  await rejectReservationEntirelyLib(reservationId, reason);

  await logAudit({
    actorId: user.id,
    action: "reserva_rejeitada",
    entityType: "reservation",
    entityId: reservationId,
    metadata: { reason },
  });

  revalidatePath("/admin/reservas");
  revalidatePath(`/admin/reservas/${reservationId}`);
}

export async function cancelReservationEntirely(reservationId: string, reason: string) {
  const user = await requireInternalUser();
  if (!reason.trim()) throw new Error("Informe o motivo do cancelamento.");
  await cancelReservationLib(reservationId);
  await logAudit({
    actorId: user.id,
    action: "reserva_cancelada",
    entityType: "reservation",
    entityId: reservationId,
    metadata: { reason: reason.trim() },
  });
  revalidatePath("/admin/reservas");
  revalidatePath(`/admin/reservas/${reservationId}`);
}
