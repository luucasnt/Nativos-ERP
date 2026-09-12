// Gatilhos automáticos para os tipos de Alert que dão para detectar sem
// inventar limite/threshold nem depender de um job agendado (que este
// projeto ainda não tem — outbox/cron só chega na Fase 7). Os outros 12
// tipos do catálogo (overbooking, reserva_sem_recursos, fatura_vencida,
// conta_vencida, financeiro_inconsistente, servico_atrasado,
// servico_nao_iniciado, sem_motorista, sem_veiculo, bagagem_incompativel,
// passageiros_acima_capacidade, parceiro_proximo_limite) ficam no enum,
// prontos para quando essa infraestrutura existir — ver README.
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAlert } from "@/lib/alerts";

export async function alertPendingExpense(params: {
  expenseId: string;
  serviceId: string;
  driverName: string;
  serviceType: string;
}) {
  await createAlert({
    type: "despesa_motorista_pendente",
    severity: "atencao",
    message: `Despesa de ${params.driverName} aguardando revisão (${params.serviceType}).`,
    entityRefType: "service",
    entityRefId: params.serviceId,
    dedupeKey: `despesa_motorista_pendente:${params.expenseId}`,
  });
}

export async function alertChangeRequestNeedsReview(params: {
  changeRequestId: string;
  protocol: string;
  type: "alteracao" | "cancelamento";
}) {
  await createAlert({
    type: params.type === "alteracao" ? "solicitacao_alteracao" : "solicitacao_cancelamento",
    severity: "atencao",
    message: `Solicitação ${params.protocol} aguardando análise.`,
    entityRefType: "change_request",
    entityRefId: params.changeRequestId,
    dedupeKey: `${params.type}:${params.changeRequestId}`,
  });
}

export async function alertSupplierRejected(params: { serviceId: string; supplierName: string; reason: string }) {
  await createAlert({
    type: "fornecedor_recusou_sem_aceite",
    severity: "critico",
    persistent: true,
    message: `${params.supplierName} recusou o serviço: ${params.reason}`,
    entityRefType: "service",
    entityRefId: params.serviceId,
    dedupeKey: `fornecedor_recusou:${params.serviceId}`,
  });
}

// Conflito exato: mesmo motorista OU mesmo veículo, mesma data e mesmo
// horário agendado em dois serviços não cancelados. Não tenta detectar
// sobreposição de intervalos (Service não modela hora de término), só a
// coincidência exata — para não inventar uma regra de duração.
export async function detectDriverVehicleConflict(serviceId: string) {
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service || !service.scheduled_date || !service.scheduled_time || service.execution_status === "cancelado") {
    return;
  }

  const orConditions = [];
  if (service.driver_id) orConditions.push({ driver_id: service.driver_id });
  if (service.vehicle_id) orConditions.push({ vehicle_id: service.vehicle_id });
  if (orConditions.length === 0) {
    return;
  }

  const conflicting = await prisma.service.findFirst({
    where: {
      id: { not: serviceId },
      scheduled_date: service.scheduled_date,
      scheduled_time: service.scheduled_time,
      execution_status: { not: "cancelado" },
      OR: orConditions,
    },
  });

  if (!conflicting) {
    return;
  }

  await createAlert({
    type: "conflito_motorista_veiculo",
    severity: "critico",
    persistent: true,
    message: `Conflito de agenda: os serviços ${service.id.slice(0, 8)} e ${conflicting.id.slice(0, 8)} têm o mesmo motorista/veículo no mesmo horário.`,
    entityRefType: "service",
    entityRefId: serviceId,
    dedupeKey: `conflito_motorista_veiculo:${[serviceId, conflicting.id].sort().join(":")}`,
  });
}

// Só "acima do limite" — o limite em si (Company.billing_limit) já existe
// no schema, então não há threshold inventado aqui. "parceiro_proximo_limite"
// (o outro tipo do catálogo para este mesmo cenário) exigiria uma margem
// arbitrária (quantos % antes do limite conta como "próximo") que a spec
// não define — fica de fora até o cliente decidir essa margem.
export async function checkPartnerBillingLimit(companyId: string) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company || !company.billing_limit) {
    return;
  }

  const outstanding = await prisma.financeEntry.aggregate({
    where: { party_type: "parceiro", party_id: companyId, status: { in: ["programado", "pendente", "vencido"] } },
    _sum: { amount: true },
  });
  const balance = outstanding._sum.amount ?? new Prisma.Decimal(0);

  if (balance.gte(company.billing_limit)) {
    await createAlert({
      type: "parceiro_acima_limite",
      severity: "critico",
      persistent: true,
      message: `${company.name} está acima do limite de faturamento (R$ ${balance.toFixed(2)} de R$ ${company.billing_limit.toFixed(2)}).`,
      entityRefType: "company",
      entityRefId: companyId,
      dedupeKey: `parceiro_acima_limite:${companyId}`,
    });
  }
}
