// Sem "server-only" — mesma razão de acceptance.ts/status.ts/tax.ts:
// precisa ser importável em testes de integração via Vitest. Mutação
// pura de negócio, sem checagem de autorização — quem chama (a Server
// Action do admin) decide quem pode chamar isto.
import { prisma } from "@/lib/prisma";

// "Rejeitar reserva inteira" (spec seção 5/6, adiado da Fase 3 para a
// Fase 6): status manual fora do algoritmo automático
// (computeReservationStatus nunca produz "rejeitado" sozinho) — uma vez
// setado aqui, recalculateReservationStatus para de recalcular esta
// reserva (ver src/lib/reservations/status.ts) até uma reversão manual.
// Cancela (nunca apaga) os lançamentos ainda não pagos de cada serviço,
// já que a reserva inteira deixou de valer.
export async function rejectReservationEntirely(reservationId: string, reason: string) {
  if (!reason.trim()) {
    throw new Error("Informe o motivo da rejeição.");
  }

  const activePayment = await prisma.financeEntry.findFirst({
    where: {
      reservation_id: reservationId,
      reversed_at: null,
      OR: [{ status: "pago" }, { payments: { some: { reversed_at: null, estorno_of_id: null } } }],
    },
    select: { id: true },
  });
  if (activePayment) {
    throw new Error("A reserva possui pagamento registrado e não pode ser rejeitada sem estorno.");
  }

  const [, , reservation] = await prisma.$transaction([
    prisma.financeEntry.updateMany({
      where: { reservation_id: reservationId, reversed_at: null, status: { in: ["programado", "pendente", "vencido"] } },
      data: { status: "cancelado", payment_eligible: false },
    }),
    prisma.service.updateMany({
      where: { reservation_id: reservationId, execution_status: { not: "cancelado" } },
      data: { execution_status: "cancelado" },
    }),
    prisma.reservation.update({
      where: { id: reservationId },
      data: { status: "rejeitado", has_partial_cancellation: false },
    }),
  ]);
  return reservation;
}
