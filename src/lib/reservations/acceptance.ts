// Sem "server-only" — mesma razão de status.ts/tax.ts: precisa ser
// importável em testes de integração via Vitest.
import { prisma } from "@/lib/prisma";
import { recalculateReservationStatus } from "@/lib/reservations/status";
import { generateServiceFinanceEntries, cancelServiceFinanceEntries } from "@/lib/finance/settlement";
import { alertSupplierRejected } from "@/lib/alerts/detectors";

// Fluxo de aceite do fornecedor (spec seção 5): aguardando_aceite ->
// aceito/recusado (com aceite_motivo). Mutação pura, sem checagem de
// autorização — cada chamador (Server Action do admin ou do portal)
// decide quem pode chamar isto e faz sua própria checagem antes.
export async function acceptService(serviceId: string) {
  const service = await prisma.service.update({
    where: { id: serviceId },
    data: { acceptance_status: "aceito", acceptance_reason: null },
  });

  // O compromisso passa a existir de fato só agora — é aqui que os
  // lançamentos "programado" do serviço nascem (spec seção 6).
  await generateServiceFinanceEntries(serviceId);
  await recalculateReservationStatus(service.reservation_id);

  return service;
}

export async function rejectService(serviceId: string, reason: string) {
  const service = await prisma.service.update({
    where: { id: serviceId },
    data: { acceptance_status: "recusado", acceptance_reason: reason },
    include: { supplier: true },
  });

  // Defensivo: se este serviço já tinha sido aceito antes (reatribuição
  // que voltou a ser recusada), cancela os lançamentos que não fazem mais
  // sentido — nunca os apaga.
  await cancelServiceFinanceEntries(serviceId);
  await recalculateReservationStatus(service.reservation_id);

  if (service.supplier) {
    await alertSupplierRejected({
      serviceId: service.id,
      supplierName: service.supplier.name,
      reason,
    });
  }

  return service;
}
