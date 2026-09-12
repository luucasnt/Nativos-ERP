// Confirmação de recebimento direto do passageiro (spec seção 5 —
// `driver_can_receive_payment`/`supplier_payment_confirmed` — e seção 6 —
// DirectCollection). Só se aplica quando o `collection_actor` do serviço
// já é motorista_proprio ou fornecedor (cobrança direta) — nesses dois
// casos, e só nesses, o motor de liquidação (Fase 4) já criou o
// lançamento de repasse correspondente.
//
// INFERIDO (Fase 5): a spec separa `receiver_type` (quem recebeu
// fisicamente: motorista_proprio | motorista_terceirizado | fornecedor)
// de `financial_responsible_type` (quem responde perante a Nativos), mas
// o motor de liquidação da Fase 4 nunca rastreia o repasse por
// motorista_terceirizado individualmente — só por fornecedor, como um
// todo (a spec seção 6 é explícita: "motoristas terceirizados... não têm
// relação financeira direta com a Nativos — só a empresa fornecedora
// tem"). Por isso, quando collection_actor=fornecedor, o registro usa
// receiver_type=fornecedor (não motorista_terceirizado) e a confirmação é
// feita pelo portal da empresa, não do motorista individual — mantendo a
// mesma granularidade que o razão já usa.
//
// "Não recebido" fica registrado aqui como fato (para o admin ver), mas
// não reverte nem cancela automaticamente o FinanceEntry de repasse
// correspondente — decidir se isso vira uma reversão formal, um ajuste ou
// uma cortesia é um julgamento financeiro do admin, feito manualmente com
// as primitivas já existentes (reverseFinanceEntry/cancelUnpaidFinanceEntry).
import type { DirectCollectionReceiverType, FinancialResponsibleType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createDirectCollection } from "@/lib/finance/ledger";

async function resolveDirectCollectionParty(serviceId: string) {
  const service = await prisma.service.findUniqueOrThrow({ where: { id: serviceId } });

  let receiverType: DirectCollectionReceiverType;
  let responsibleType: FinancialResponsibleType;
  let partyId: string;
  let repasseCategoryKey: string;

  if (service.collection_actor === "motorista_proprio" && service.driver_id) {
    receiverType = "motorista_proprio";
    responsibleType = "driver";
    partyId = service.driver_id;
    repasseCategoryKey = "repasse_motorista";
  } else if (service.collection_actor === "fornecedor" && service.supplier_id) {
    receiverType = "fornecedor";
    responsibleType = "company";
    partyId = service.supplier_id;
    repasseCategoryKey = "repasse_fornecedor";
  } else {
    throw new Error("Este serviço não é de cobrança direta.");
  }

  const entry = await prisma.financeEntry.findUnique({
    where: { auto_key: `svc:${serviceId}:${repasseCategoryKey}` },
  });

  return { receiverType, responsibleType, partyId, amount: entry?.amount ?? service.price };
}

export async function confirmDirectCollectionReceived(serviceId: string) {
  const { receiverType, responsibleType, partyId, amount } = await resolveDirectCollectionParty(serviceId);

  return createDirectCollection({
    service_id: serviceId,
    receiver_type: receiverType,
    receiver_id: partyId,
    financial_responsible_type: responsibleType,
    financial_responsible_id: partyId,
    amount,
    status: "received",
    idempotency_key: `direct_collection:${serviceId}`,
  });
}

export async function confirmDirectCollectionNotReceived(serviceId: string, reasonId: string) {
  const { receiverType, responsibleType, partyId, amount } = await resolveDirectCollectionParty(serviceId);

  return createDirectCollection({
    service_id: serviceId,
    receiver_type: receiverType,
    receiver_id: partyId,
    financial_responsible_type: responsibleType,
    financial_responsible_id: partyId,
    amount,
    status: "not_received",
    not_received_reason_id: reasonId,
    idempotency_key: `direct_collection:${serviceId}`,
  });
}
