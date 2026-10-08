import { prisma } from "@/lib/prisma";
import { recalculateReservationStatus } from "@/lib/reservations/status";
import { generateServiceFinanceEntries, cancelServiceFinanceEntries } from "@/lib/finance/settlement";
import { alertSupplierRejected } from "@/lib/alerts/detectors";

async function respond(serviceId: string, accepted: boolean, reason?: string) {
  return prisma.$transaction(async (tx) => {
    const relation = await tx.service.findUniqueOrThrow({ where: { id: serviceId }, select: { reservation_id: true } });
    await tx.$queryRaw`SELECT id FROM reservations WHERE id = ${relation.reservation_id}::uuid FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM services WHERE id = ${serviceId}::uuid FOR UPDATE`;
    const current = await tx.service.findUniqueOrThrow({ where: { id: serviceId }, include: { reservation: true, supplier: true } });
    if (["cancelado", "rejeitado"].includes(current.reservation.status) || current.execution_status !== "agendado") throw new Error("Este serviço não pode mais receber aceite ou recusa.");
    const target = accepted ? "aceito" : "recusado";
    if (current.acceptance_status !== target && current.acceptance_status !== "aguardando_aceite") throw new Error("O serviço já foi respondido. Solicite a reatribuição antes de mudar a resposta.");
    if (current.acceptance_status === target) return { service: current, changed: false };
    const service = await tx.service.update({ where: { id: serviceId }, data: { acceptance_status: target, acceptance_reason: accepted ? null : reason }, include: { supplier: true } });
    if (accepted) await generateServiceFinanceEntries(serviceId, tx);
    else await cancelServiceFinanceEntries(serviceId, tx);
    await recalculateReservationStatus(service.reservation_id, tx);
    return { service, changed: true };
  });
}
export async function acceptService(serviceId: string) {
  return (await respond(serviceId, true)).service;
}
export async function rejectService(serviceId: string, reason: string) {
  if (!reason.trim() || reason.trim().length > 1000) throw new Error("Informe um motivo de recusa de até 1000 caracteres.");
  const { service, changed } = await respond(serviceId, false, reason.trim());
  if (changed && service.supplier) await alertSupplierRejected({ serviceId: service.id, supplierName: service.supplier.name, reason: reason.trim() });
  return service;
}
