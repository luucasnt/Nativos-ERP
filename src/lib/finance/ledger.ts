// Primitivas do razão financeiro (spec seção 6). Regras não-negociáveis:
//
// 1. Nenhuma função aqui jamais faz DELETE físico em FinanceEntry, Payment,
//    Compensation ou DirectCollection — mesmo que quisesse, o trigger de
//    banco (prisma/migrations/20260912150700_financial_integrity_triggers)
//    bloqueia. Toda reversão é um novo registro (estorno_of_id) mais uma
//    atualização de metadados (reversed_at/reversed_by_id/reversal_reason)
//    no registro original — nunca sua remoção.
// 2. Todo campo de idempotência (auto_key/dedupe_key/idempotency_key) é
//    tratado como "criar ou devolver o que já existe", nunca como erro de
//    duplicidade a ignorar silenciosamente nem como duplicata a criar de
//    novo — a chamada é sempre segura de repetir.
import { Prisma } from "@prisma/client";
import type {
  CompensationCounterpartyType,
  DirectCollectionReceiverType,
  FinanceEntryCategory,
  FinanceEntryOriginType,
  FinancePartyType,
  FinancialResponsibleType,
  PaymentMethod,
  PaymentType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

type CreateFinanceEntryInput = {
  type: "receita" | "despesa";
  category: FinanceEntryCategory;
  amount: Prisma.Decimal.Value;
  party_type: FinancePartyType;
  party_id?: string | null;
  reservation_id?: string | null;
  service_id?: string | null;
  origin_type: FinanceEntryOriginType;
  origin_id?: string | null;
  description?: string | null;
  due_date?: Date | null;
  auto_key: string;
};

// Idempotente: chamar de novo com o mesmo auto_key devolve o lançamento já
// existente em vez de criar um duplicado ou lançar erro de constraint.
export async function createFinanceEntry(input: CreateFinanceEntryInput) {
  const existing = await prisma.financeEntry.findUnique({ where: { auto_key: input.auto_key } });
  if (existing) {
    return existing;
  }

  return prisma.financeEntry.create({
    data: {
      type: input.type,
      category: input.category,
      status: "programado",
      payment_eligible: false,
      amount: input.amount,
      party_type: input.party_type,
      party_id: input.party_id,
      reservation_id: input.reservation_id,
      service_id: input.service_id,
      origin_type: input.origin_type,
      origin_id: input.origin_id,
      description: input.description,
      due_date: input.due_date,
      auto_key: input.auto_key,
    },
  });
}

// Regra não-negociável (spec seção 6, item 5): um lançamento só fica
// elegível a pagamento quando o marco operacional (serviço concluído) foi
// atingido — nunca antes. Esta função é o único lugar que liga
// payment_eligible=true, e só é chamada quando esse marco é confirmado.
export async function markFinanceEntryEligible(entryId: string) {
  const entry = await prisma.financeEntry.findUniqueOrThrow({ where: { id: entryId } });

  if (entry.status === "cancelado" || entry.reversed_at) {
    return entry;
  }

  return prisma.financeEntry.update({
    where: { id: entryId },
    data: { status: "pendente", payment_eligible: true },
  });
}

// Cancela um lançamento que ainda não gerou nenhum pagamento real — isto é
// um UPDATE de status (permitido), não uma reversão formal, porque nada
// foi de fato liquidado ainda. Uma vez que existir um Payment "pago", usar
// reverseFinanceEntry em vez desta função.
export async function cancelUnpaidFinanceEntry(entryId: string) {
  const entry = await prisma.financeEntry.findUniqueOrThrow({
    where: { id: entryId },
    include: { payments: true },
  });

  if (entry.status === "pago" || entry.payments.some((p) => !p.reversed_at)) {
    throw new Error(
      "Este lançamento já tem pagamento registrado — reverta o pagamento em vez de cancelar diretamente.",
    );
  }

  return prisma.financeEntry.update({
    where: { id: entryId },
    data: { status: "cancelado", payment_eligible: false },
  });
}

// Reversão formal (estorno) de um lançamento já elegível/pago — cria um
// novo lançamento de tipo oposto (nunca apaga o original) e marca o
// original como revertido.
export async function reverseFinanceEntry(
  entryId: string,
  params: { actorId: string; reason: string; autoKey: string },
) {
  const original = await prisma.financeEntry.findUniqueOrThrow({ where: { id: entryId } });

  if (original.reversed_at) {
    const existingReversal = await prisma.financeEntry.findFirst({
      where: { estorno_of_id: entryId },
    });
    if (existingReversal) {
      return existingReversal;
    }
    throw new Error("Lançamento já marcado como revertido, mas o estorno correspondente não foi encontrado.");
  }

  const existingReversal = await prisma.financeEntry.findUnique({
    where: { auto_key: params.autoKey },
  });
  if (existingReversal) {
    return existingReversal;
  }

  const [, reversal] = await prisma.$transaction([
    prisma.financeEntry.update({
      where: { id: entryId },
      data: {
        reversed_at: new Date(),
        reversed_by_id: params.actorId,
        reversal_reason: params.reason,
        status: "cancelado",
        payment_eligible: false,
      },
    }),
    prisma.financeEntry.create({
      data: {
        type: original.type === "receita" ? "despesa" : "receita",
        category: "estorno",
        status: "pago",
        payment_eligible: false,
        amount: original.amount,
        party_type: original.party_type,
        party_id: original.party_id,
        reservation_id: original.reservation_id,
        service_id: original.service_id,
        origin_type: original.origin_type,
        origin_id: original.origin_id,
        estorno_of_id: entryId,
        auto_key: params.autoKey,
        description: `Estorno: ${params.reason}`,
      },
    }),
  ]);

  return reversal;
}

type CreatePaymentInput = {
  finance_entry_id: string;
  type: PaymentType;
  amount: Prisma.Decimal.Value;
  payment_method: PaymentMethod;
  bank_account_id?: string | null;
  receipt_url?: string | null;
  dedupe_key: string;
};

export async function createPayment(input: CreatePaymentInput) {
  const existing = await prisma.payment.findUnique({ where: { dedupe_key: input.dedupe_key } });
  if (existing) {
    return existing;
  }

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        finance_entry_id: input.finance_entry_id,
        type: input.type,
        amount: input.amount,
        payment_method: input.payment_method,
        bank_account_id: input.bank_account_id,
        receipt_url: input.receipt_url,
        dedupe_key: input.dedupe_key,
      },
    });

    await tx.financeEntry.update({
      where: { id: input.finance_entry_id },
      data: { status: "pago" },
    });

    return payment;
  });
}

export async function reversePayment(
  paymentId: string,
  params: { actorId: string; reason: string; dedupeKey: string },
) {
  const original = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });

  if (original.reversed_at) {
    return original;
  }

  const existingReversal = await prisma.payment.findUnique({
    where: { dedupe_key: params.dedupeKey },
  });
  if (existingReversal) {
    return existingReversal;
  }

  const [, reversal] = await prisma.$transaction([
    prisma.payment.update({
      where: { id: paymentId },
      data: {
        reversed_at: new Date(),
        reversed_by_id: params.actorId,
        reversal_reason: params.reason,
      },
    }),
    prisma.payment.create({
      data: {
        finance_entry_id: original.finance_entry_id,
        type: original.type === "recebimento" ? "pagamento" : "recebimento",
        amount: original.amount,
        payment_method: original.payment_method,
        bank_account_id: original.bank_account_id,
        estorno_of_id: paymentId,
        dedupe_key: params.dedupeKey,
      },
    }),
  ]);

  await prisma.financeEntry.update({
    where: { id: original.finance_entry_id },
    data: { status: "pendente" },
  });

  return reversal;
}

type CreateDirectCollectionInput = {
  service_id: string;
  receiver_type: DirectCollectionReceiverType;
  receiver_id: string;
  financial_responsible_type: FinancialResponsibleType;
  financial_responsible_id: string;
  amount: Prisma.Decimal.Value;
  idempotency_key: string;
};

export async function createDirectCollection(input: CreateDirectCollectionInput) {
  const existing = await prisma.directCollection.findUnique({
    where: { idempotency_key: input.idempotency_key },
  });
  if (existing) {
    return existing;
  }

  return prisma.directCollection.create({
    data: {
      service_id: input.service_id,
      receiver_type: input.receiver_type,
      receiver_id: input.receiver_id,
      financial_responsible_type: input.financial_responsible_type,
      financial_responsible_id: input.financial_responsible_id,
      amount: input.amount,
      idempotency_key: input.idempotency_key,
    },
  });
}

type CreateCompensationInput = {
  counterparty_type: CompensationCounterpartyType;
  counterparty_id: string;
  payable_allocation: Prisma.InputJsonValue;
  receivable_allocation: Prisma.InputJsonValue;
  amount: Prisma.Decimal.Value;
  idempotency_key: string;
  entryIds: string[];
};

// Compensação entre obrigações opostas da mesma contraparte (spec seção
// 6): liga os FinanceEntry envolvidos via compensacao_id, sem apagar nada.
export async function createCompensation(input: CreateCompensationInput) {
  const existing = await prisma.compensation.findUnique({
    where: { idempotency_key: input.idempotency_key },
  });
  if (existing) {
    return existing;
  }

  return prisma.$transaction(async (tx) => {
    const compensation = await tx.compensation.create({
      data: {
        counterparty_type: input.counterparty_type,
        counterparty_id: input.counterparty_id,
        payable_allocation: input.payable_allocation,
        receivable_allocation: input.receivable_allocation,
        amount: input.amount,
        idempotency_key: input.idempotency_key,
      },
    });

    await tx.financeEntry.updateMany({
      where: { id: { in: input.entryIds } },
      data: { compensacao_id: compensation.id, status: "pago", payment_eligible: false },
    });

    return compensation;
  });
}
