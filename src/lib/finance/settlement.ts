// Motor de liquidação por serviço (spec seção 6 — "lógica comercial
// central: 3 variáveis independentes por serviço"). computeServiceSettlementEntries
// é uma função pura (testável sem banco) que decide QUAIS lançamentos
// nascem para um serviço, a partir de:
//   1. execution_type (própria vs. fornecedor)
//   2. collection_actor, derivado de collection_mode + execution_type
//      (quem cobra o passageiro: Nativos, motorista próprio ou fornecedor)
//   3. is_cortesia (sem cobrança = sem lançamento de receita)
// mais, quando execution_type=fornecedor e a cobrança é direta, o modo de
// liquidação do fornecedor (retém custo / repassa bruto).
import { Prisma } from "@prisma/client";
import type {
  CollectionMode,
  DriverPaymentType,
  ExecutionType,
  FinanceEntryCategory,
  FinancePartyType,
  OwnerType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeCollectionActor } from "@/lib/reservations/pricing";
import { createCompensation, createFinanceEntry, cancelUnpaidFinanceEntry, markFinanceEntryEligible } from "@/lib/finance/ledger";

export type ServiceSettlementInput = {
  price: Prisma.Decimal.Value;
  supplier_cost: Prisma.Decimal.Value | null;
  execution_type: ExecutionType;
  collection_mode: CollectionMode;
  is_cortesia: boolean;
  origin_partner_id: string | null;
  client_id: string;
  supplier_id: string | null;
  supplier_settlement_mode: "retain_supplier_cost" | "gross_repass" | null;
  driver_id: string | null;
  driver_owner_type: OwnerType | null;
  driver_payment_type: DriverPaymentType | null;
  driver_commission_percent: Prisma.Decimal.Value | null;
};

export type EntrySpec = {
  key: string;
  type: "receita" | "despesa";
  category: FinanceEntryCategory;
  amount: Prisma.Decimal;
  party_type: FinancePartyType;
  party_id: string | null;
};

// INFERIDO (Fase 4): só há uma fórmula clara e determinística para
// remuneração do motorista próprio por serviço quando payment_type é
// "comissao" ou "mesclado" (percentual sobre o price). Para "diaria" e
// "salario_mensal" não há, na especificação, uma regra de como isso se
// divide entre múltiplos serviços do mesmo dia/mês — em vez de inventar
// um rateio, este motor não gera lançamento automático nesses dois casos
// (ver README, seção de pendências).
function computeOwnDriverCommissionPay(
  price: Prisma.Decimal,
  paymentType: DriverPaymentType | null,
  commissionPercent: Prisma.Decimal.Value | null,
): Prisma.Decimal | null {
  if ((paymentType === "comissao" || paymentType === "mesclado") && commissionPercent) {
    return price.mul(commissionPercent).div(100);
  }
  return null;
}

export function computeServiceSettlementEntries(input: ServiceSettlementInput): EntrySpec[] {
  const entries: EntrySpec[] = [];
  const price = new Prisma.Decimal(input.price);
  const supplierCost = input.supplier_cost !== null ? new Prisma.Decimal(input.supplier_cost) : new Prisma.Decimal(0);
  const collectionActor = computeCollectionActor(input.collection_mode, input.execution_type);
  const isGross = input.supplier_settlement_mode === "gross_repass";

  // --- O que foi de fato cobrado do passageiro (nada, se cortesia) ---
  if (!input.is_cortesia) {
    if (collectionActor === "nativos") {
      const isFaturado = input.collection_mode === "faturado";
      entries.push({
        key: "venda_servico",
        type: "receita",
        category: "venda_servico",
        amount: price,
        party_type: isFaturado ? "parceiro" : "cliente",
        party_id: isFaturado ? input.origin_partner_id : input.client_id,
      });
    } else if (collectionActor === "fornecedor" && input.supplier_id) {
      // Retém custo -> só a margem; repassa bruto -> o valor cheio (o
      // custo do fornecedor é pago separadamente abaixo).
      const amount = isGross ? price : price.minus(supplierCost);
      if (amount.gt(0)) {
        entries.push({
          key: "repasse_fornecedor",
          type: "receita",
          category: "repasse_fornecedor",
          amount,
          party_type: "fornecedor",
          party_id: input.supplier_id,
        });
      }
    } else if (collectionActor === "motorista_proprio" && input.driver_id) {
      // INFERIDO: sem um campo de "modo de liquidação" próprio para
      // motorista próprio (só Company tem direct_collection_settlement_mode),
      // aplicamos por analogia o mesmo padrão de "retém a própria
      // remuneração e repassa a margem" usado para fornecedor.
      const driverPay =
        computeOwnDriverCommissionPay(price, input.driver_payment_type, input.driver_commission_percent) ??
        new Prisma.Decimal(0);
      const amount = price.minus(driverPay);
      if (amount.gt(0)) {
        entries.push({
          key: "repasse_motorista",
          type: "receita",
          category: "repasse_motorista",
          amount,
          party_type: "motorista",
          party_id: input.driver_id,
        });
      }
    }
  }

  // --- Custo que a Nativos deve ao executor, quando não foi retido por
  //     ele mesmo de uma cobrança direta acima ---
  if (input.execution_type === "fornecedor" && input.supplier_id) {
    const nativosOwesCostSeparately = collectionActor === "nativos" || (collectionActor === "fornecedor" && isGross);
    if (nativosOwesCostSeparately && supplierCost.gt(0)) {
      entries.push({
        key: "pagamento_fornecedor",
        type: "despesa",
        category: "pagamento_fornecedor",
        amount: supplierCost,
        party_type: "fornecedor",
        party_id: input.supplier_id,
      });
    }
  }

  if (input.execution_type === "propria" && input.driver_id && input.driver_owner_type === "proprio") {
    if (collectionActor === "nativos") {
      const driverPay = computeOwnDriverCommissionPay(price, input.driver_payment_type, input.driver_commission_percent);
      if (driverPay && driverPay.gt(0)) {
        entries.push({
          key: "repasse_motorista",
          type: "despesa",
          category: "repasse_motorista",
          amount: driverPay,
          party_type: "motorista",
          party_id: input.driver_id,
        });
      }
    }
  }

  return entries;
}

async function loadSettlementInput(serviceId: string): Promise<{
  reservationId: string;
  input: ServiceSettlementInput;
}> {
  const service = await prisma.service.findUniqueOrThrow({
    where: { id: serviceId },
    include: {
      reservation: true,
      supplier: true,
      driver: true,
    },
  });

  return {
    reservationId: service.reservation_id,
    input: {
      price: service.price,
      supplier_cost: service.supplier_cost,
      execution_type: service.execution_type,
      collection_mode: service.reservation.collection_mode,
      is_cortesia: service.reservation.is_cortesia,
      origin_partner_id: service.reservation.origin_partner_id,
      client_id: service.reservation.client_id,
      supplier_id: service.supplier_id,
      supplier_settlement_mode: service.supplier?.direct_collection_settlement_mode ?? null,
      driver_id: service.driver_id,
      driver_owner_type: service.driver?.owner_type ?? null,
      driver_payment_type: service.driver?.payment_type ?? null,
      driver_commission_percent: service.driver?.commission ?? null,
    },
  };
}

async function upsertProgrammedEntry(serviceId: string, reservationId: string, spec: EntrySpec) {
  const autoKey = `svc:${serviceId}:${spec.key}`;
  const existing = await prisma.financeEntry.findUnique({ where: { auto_key: autoKey } });

  if (!existing) {
    return createFinanceEntry({
      type: spec.type,
      category: spec.category,
      amount: spec.amount,
      party_type: spec.party_type,
      party_id: spec.party_id,
      reservation_id: reservationId,
      service_id: serviceId,
      origin_type: "service_settlement",
      origin_id: serviceId,
      auto_key: autoKey,
    });
  }

  // Só um lançamento ainda em rascunho (programado, nunca revertido) pode
  // ser ajustado in-place — uma vez elegível/pago, mudar de valor exige
  // uma reversão formal, não uma edição silenciosa.
  if (existing.status === "programado" && !existing.reversed_at) {
    return prisma.financeEntry.update({
      where: { id: existing.id },
      data: { amount: spec.amount, party_type: spec.party_type, party_id: spec.party_id },
    });
  }

  return existing;
}

// Chamado quando um serviço passa a ser um compromisso confirmado
// (aceite=aceito) e sempre que seus dados relevantes mudam — recalcula do
// zero o conjunto de lançamentos "programado" que ele deveria ter,
// criando/ajustando os que ainda fazem sentido e cancelando (nunca
// apagando) os que deixaram de se aplicar.
export async function generateServiceFinanceEntries(serviceId: string) {
  const { reservationId, input } = await loadSettlementInput(serviceId);
  const desired = computeServiceSettlementEntries(input);
  const desiredKeys = new Set(desired.map((d) => `svc:${serviceId}:${d.key}`));

  for (const spec of desired) {
    await upsertProgrammedEntry(serviceId, reservationId, spec);
  }

  const existingEntries = await prisma.financeEntry.findMany({
    where: { service_id: serviceId, status: "programado", reversed_at: null },
  });

  for (const entry of existingEntries) {
    if (entry.auto_key && !desiredKeys.has(entry.auto_key)) {
      await cancelUnpaidFinanceEntry(entry.id);
    }
  }
}

// Regra não-negociável (spec seção 6, item 5): só fica elegível a
// pagamento quando o marco operacional (serviço concluído) é atingido.
export async function markServiceFinanceEntriesEligible(serviceId: string) {
  const entries = await prisma.financeEntry.findMany({
    where: { service_id: serviceId, status: "programado", reversed_at: null },
  });

  for (const entry of entries) {
    await markFinanceEntryEligible(entry.id);
  }

  await compensateGrossRepassPairIfPresent(serviceId);
}

// Único par de compensação automática implementado nesta fase: quando o
// fornecedor repassou o bruto (gross_repass), o mesmo serviço gera
// simultaneamente uma receita (repasse_fornecedor, fornecedor deve a
// Nativos) e uma despesa (pagamento_fornecedor, Nativos deve ao
// fornecedor) para a mesma contraparte — exatamente o caso que
// Compensation existe para resolver (spec seção 6). Não faz uma varredura
// geral do razão; outras compensações ficam para uma ação manual futura.
async function compensateGrossRepassPairIfPresent(serviceId: string) {
  const [receivable, payable] = await Promise.all([
    prisma.financeEntry.findUnique({
      where: { auto_key: `svc:${serviceId}:repasse_fornecedor` },
    }),
    prisma.financeEntry.findUnique({
      where: { auto_key: `svc:${serviceId}:pagamento_fornecedor` },
    }),
  ]);

  if (
    !receivable ||
    !payable ||
    receivable.reversed_at ||
    payable.reversed_at ||
    receivable.compensacao_id ||
    payable.compensacao_id ||
    !receivable.party_id ||
    receivable.party_id !== payable.party_id
  ) {
    return;
  }

  const amount = receivable.amount.lt(payable.amount) ? receivable.amount : payable.amount;

  await createCompensation({
    counterparty_type: "supplier",
    counterparty_id: receivable.party_id,
    payable_allocation: { finance_entry_id: payable.id, amount: payable.amount.toString() },
    receivable_allocation: { finance_entry_id: receivable.id, amount: receivable.amount.toString() },
    amount,
    idempotency_key: `svc:${serviceId}:compensacao_gross_repass`,
    entryIds: [receivable.id, payable.id],
  });
}

// Cancela (nunca apaga) os lançamentos ainda não pagos de um serviço
// cancelado.
export async function cancelServiceFinanceEntries(serviceId: string) {
  const entries = await prisma.financeEntry.findMany({
    where: { service_id: serviceId, reversed_at: null, status: { in: ["programado", "pendente"] } },
  });

  for (const entry of entries) {
    await cancelUnpaidFinanceEntry(entry.id);
  }
}
