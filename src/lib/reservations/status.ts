// Sem "server-only": este módulo só orquestra Prisma (que já não funciona
// em bundle de cliente) e precisa ser importável em testes de integração
// via Vitest — o pacote "server-only" lança erro incondicionalmente fora
// do runtime de Server Component do Next.js (não faz checagem de
// `typeof window`), o que inviabilizaria testá-lo diretamente.
import { prisma } from "@/lib/prisma";
import { computeReservationStatus } from "@/lib/reservations/status-pure";

export { computeReservationStatus } from "@/lib/reservations/status-pure";

export async function recalculateReservationStatus(reservationId: string) {
  const current = await prisma.reservation.findUniqueOrThrow({
    where: { id: reservationId },
    select: { status: true, has_partial_cancellation: true },
  });

  // "rejeitado" é uma ação manual do admin (Fase 6), fora do algoritmo
  // automático — nunca é produzido nem desfeito por ele. Uma vez rejeitada,
  // editar os serviços da reserva não a "reabre" silenciosamente.
  if (current.status === "rejeitado") {
    return { status: current.status, has_partial_cancellation: current.has_partial_cancellation };
  }

  const services = await prisma.service.findMany({
    where: { reservation_id: reservationId },
    select: { acceptance_status: true, execution_status: true },
  });

  const result = computeReservationStatus(services);

  await prisma.reservation.update({
    where: { id: reservationId },
    data: {
      status: result.status,
      has_partial_cancellation: result.has_partial_cancellation,
    },
  });

  return result;
}
