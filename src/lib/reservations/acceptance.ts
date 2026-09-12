import "server-only";
import { prisma } from "@/lib/prisma";
import { recalculateReservationStatus } from "@/lib/reservations/status";

// Fluxo de aceite do fornecedor (spec seção 5): aguardando_aceite ->
// aceito/recusado (com aceite_motivo). Mutação pura, sem checagem de
// autorização — cada chamador (Server Action do admin ou do portal)
// decide quem pode chamar isto e faz sua própria checagem antes.
export async function acceptService(serviceId: string) {
  const service = await prisma.service.update({
    where: { id: serviceId },
    data: { acceptance_status: "aceito", acceptance_reason: null },
  });

  await recalculateReservationStatus(service.reservation_id);

  return service;
}

export async function rejectService(serviceId: string, reason: string) {
  const service = await prisma.service.update({
    where: { id: serviceId },
    data: { acceptance_status: "recusado", acceptance_reason: reason },
  });

  await recalculateReservationStatus(service.reservation_id);

  return service;
}
