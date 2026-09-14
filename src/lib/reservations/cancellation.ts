import { prisma } from "@/lib/prisma";

export async function cancelReservation(reservationId: string) {
  const reservation = await prisma.reservation.findUniqueOrThrow({ where: { id: reservationId } });
  if (reservation.status === "cancelado") return reservation;
  if (reservation.status === "rejeitado") throw new Error("Uma reserva rejeitada não pode ser cancelada novamente.");

  const activePayment = await prisma.financeEntry.findFirst({
    where: {
      reservation_id: reservationId,
      reversed_at: null,
      OR: [
        { status: "pago" },
        { payments: { some: { reversed_at: null, estorno_of_id: null } } },
      ],
    },
    select: { id: true },
  });
  if (activePayment) {
    throw new Error("A reserva possui pagamento registrado. Faça o estorno ou gere o crédito antes de cancelar.");
  }

  const [, , updated] = await prisma.$transaction([
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
      data: { status: "cancelado", has_partial_cancellation: false },
    }),
  ]);
  return updated;
}
