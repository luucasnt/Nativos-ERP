// Sem "server-only": este módulo só orquestra Prisma (que já não funciona
// em bundle de cliente) e precisa ser importável em testes de integração
// via Vitest — o pacote "server-only" lança erro incondicionalmente fora
// do runtime de Server Component do Next.js (não faz checagem de
// `typeof window`), o que inviabilizaria testá-lo diretamente.
import { prisma } from "@/lib/prisma";
import { computeReservationStatus } from "@/lib/reservations/status-pure";

export { computeReservationStatus } from "@/lib/reservations/status-pure";

export async function recalculateReservationStatus(reservationId: string) {
  const services = await prisma.service.findMany({
    where: { reservation_id: reservationId },
    select: { acceptance_status: true, execution_status: true },
  });

  const status = computeReservationStatus(services);

  await prisma.reservation.update({
    where: { id: reservationId },
    data: { status },
  });

  return status;
}
