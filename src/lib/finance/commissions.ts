// Comissões que existem no nível da RESERVA, não do serviço individual:
// comissao_parceiro (o parceiro de origem, quando comissionado) e
// comissao_indicacao (o indicador da reserva, com percentual próprio por
// reserva). Espelha o desenho de recalculateReservationTax — soma o
// `price` dos serviços não cancelados, ignora cortesia/tarifa NET.
import { Prisma } from "@prisma/client";
import type { FinancePartyType, ReferrerType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createFinanceEntry, cancelUnpaidFinanceEntry, markFinanceEntryEligible } from "@/lib/finance/ledger";

function referrerPartyType(referrerType: ReferrerType): FinancePartyType {
  switch (referrerType) {
    case "company":
      return "parceiro";
    case "driver":
      return "motorista";
    case "client":
      return "cliente";
    case "pessoa_fisica":
      return "pessoa_fisica";
  }
}

async function upsertReservationEntry(
  reservationId: string,
  key: string,
  spec: {
    category: "comissao_parceiro" | "comissao_indicacao";
    amount: Prisma.Decimal;
    party_type: FinancePartyType;
    party_id: string | null;
  },
) {
  const autoKey = `res:${reservationId}:${key}`;
  const existing = await prisma.financeEntry.findUnique({ where: { auto_key: autoKey } });

  if (!existing) {
    return createFinanceEntry({
      type: "despesa",
      category: spec.category,
      amount: spec.amount,
      party_type: spec.party_type,
      party_id: spec.party_id,
      reservation_id: reservationId,
      origin_type: "manual",
      auto_key: autoKey,
    });
  }

  if (existing.status === "programado" && !existing.reversed_at) {
    return prisma.financeEntry.update({
      where: { id: existing.id },
      data: { amount: spec.amount, party_type: spec.party_type, party_id: spec.party_id },
    });
  }

  return existing;
}

// INFERIDO (Fase 4): "tarifa NET" (is_net_fare) é descrita na especificação
// como "parceiro não recebe comissão nessa reserva" — interpretado aqui
// como bloqueando as duas comissões (parceiro E indicador), não só a do
// parceiro, já que "tarifa líquida" convencionalmente significa isenta de
// qualquer comissão.
export async function recalculateReservationCommissions(reservationId: string) {
  const reservation = await prisma.reservation.findUniqueOrThrow({
    where: { id: reservationId },
    include: { services: true, origin_partner: true },
  });

  const base = reservation.services
    .filter((s) => s.execution_status !== "cancelado")
    .reduce((sum, s) => sum.add(s.price), new Prisma.Decimal(0));

  const commissionsApply = !reservation.is_net_fare && !reservation.is_cortesia;

  const partnerKey = "comissao_parceiro";
  if (
    commissionsApply &&
    reservation.origin_partner_id &&
    reservation.origin_partner?.commission_enabled &&
    reservation.origin_partner.commission &&
    base.gt(0)
  ) {
    await upsertReservationEntry(reservationId, partnerKey, {
      category: "comissao_parceiro",
      amount: base.mul(reservation.origin_partner.commission).div(100),
      party_type: "parceiro",
      party_id: reservation.origin_partner_id,
    });
  } else {
    await cancelStaleReservationEntry(reservationId, partnerKey);
  }

  const referrerKey = "comissao_indicacao";
  if (
    commissionsApply &&
    reservation.referrer_type &&
    reservation.commission_percent &&
    base.gt(0)
  ) {
    await upsertReservationEntry(reservationId, referrerKey, {
      category: "comissao_indicacao",
      amount: base.mul(reservation.commission_percent).div(100),
      party_type: referrerPartyType(reservation.referrer_type),
      party_id: reservation.referrer_type === "pessoa_fisica" ? null : reservation.referrer_id,
    });
  } else {
    await cancelStaleReservationEntry(reservationId, referrerKey);
  }
}

async function cancelStaleReservationEntry(reservationId: string, key: string) {
  const autoKey = `res:${reservationId}:${key}`;
  const existing = await prisma.financeEntry.findUnique({ where: { auto_key: autoKey } });
  if (existing && existing.status === "programado" && !existing.reversed_at) {
    await cancelUnpaidFinanceEntry(existing.id);
  }
}

// Comissões da reserva ficam elegíveis quando a reserva inteira é
// concluída (marco no nível da reserva, análogo ao "serviço concluído"
// exigido para lançamentos por serviço).
export async function markReservationCommissionsEligible(reservationId: string) {
  const entries = await prisma.financeEntry.findMany({
    where: {
      reservation_id: reservationId,
      service_id: null,
      category: { in: ["comissao_parceiro", "comissao_indicacao"] },
      status: "programado",
      reversed_at: null,
    },
  });

  for (const entry of entries) {
    await markFinanceEntryEligible(entry.id);
  }
}
