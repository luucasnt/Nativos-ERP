import { prisma } from "@/lib/prisma";

export async function terminateReservation(reservationId: string, status: "cancelado" | "rejeitado") {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM reservations WHERE id = ${reservationId}::uuid FOR UPDATE`;
    const reservation = await tx.reservation.findUniqueOrThrow({ where: { id: reservationId } });
    if (reservation.status === status) return reservation;
    if (["cancelado", "rejeitado"].includes(reservation.status)) throw new Error("Esta reserva já foi encerrada.");
    // Same order as payments/settlement: reservation, financial entries.
    await tx.$queryRaw`SELECT id FROM finance_entries WHERE reservation_id = ${reservationId}::uuid ORDER BY id FOR UPDATE`;
    const settled = await tx.financeEntry.findFirst({ where: { reservation_id: reservationId, reversed_at: null, OR: [
      { status: "pago" }, { payments: { some: { reversed_at: null, estorno_of_id: null } } },
      { compensacao: { is: { status: "confirmada", reversed_at: null } } },
    ] }, select: { id: true } });
    if (settled) throw new Error("A reserva possui pagamento ou compensação registrado. Faça o estorno antes de encerrar.");
    await tx.financeEntry.updateMany({ where: { reservation_id: reservationId, reversed_at: null, status: { in: ["programado", "pendente", "vencido"] } }, data: { status: "cancelado", payment_eligible: false } });
    await tx.service.updateMany({ where: { reservation_id: reservationId, execution_status: { not: "cancelado" } }, data: { execution_status: "cancelado" } });
    return tx.reservation.update({ where: { id: reservationId }, data: { status, has_partial_cancellation: false } });
  });
}

export async function terminateService(reservationId: string, serviceId: string, actorId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM reservations WHERE id = ${reservationId}::uuid FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM services WHERE id = ${serviceId}::uuid FOR UPDATE`;
    const service = await tx.service.findUniqueOrThrow({ where: { id: serviceId } });
    if (service.reservation_id !== reservationId) throw new Error("O serviço não pertence a esta reserva.");
    if (service.execution_status === "cancelado") return service;
    await tx.$queryRaw`SELECT id FROM finance_entries WHERE service_id = ${serviceId}::uuid ORDER BY id FOR UPDATE`;
    const settled = await tx.financeEntry.findFirst({ where: { service_id: serviceId, reversed_at: null, OR: [
      { status: "pago" }, { payments: { some: { reversed_at: null, estorno_of_id: null } } },
      { compensacao: { is: { status: "confirmada", reversed_at: null } } },
    ] } });
    if (settled) throw new Error("Este serviço possui pagamento ou compensação registrado. Faça o estorno antes de cancelar.");
    await tx.financeEntry.updateMany({ where: { service_id: serviceId, reversed_at: null, status: { in: ["programado", "pendente", "vencido"] } }, data: { status: "cancelado", payment_eligible: false } });
    const updated = await tx.service.update({ where: { id: serviceId }, data: { execution_status: "cancelado" } });
    await tx.auditLog.create({ data: { actor_id: actorId, action: "servico_cancelado", entity_type: "service", entity_id: serviceId } });
    return updated;
  });
}
