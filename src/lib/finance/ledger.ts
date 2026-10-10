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
import { effectivePaymentDate } from "@/lib/finance/payment-date";
import { canRegisterEntryPayment, isReservationSale } from "@/lib/finance/payment-availability";
import { Prisma } from "@prisma/client";
import type {
  CompensationCounterpartyType,
  DirectCollectionReceiverType,
  DirectCollectionStatus,
  FinanceEntryCategory,
  FinanceEntryOriginType,
  FinanceEntryStatus,
  FinancePartyType,
  FinancialResponsibleType,
  PaymentMethod,
  PaymentType,
  FinanceEntry,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { businessDay } from "@/lib/finance/cash-closing";

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
  // Regra geral: todo lançamento nasce "programado" (rascunho, editável até
  // um marco operacional o tornar elegível). A única exceção é um registro
  // de rastreio que já nasce fechado por não haver nada a cobrar/pagar de
  // fato (ex.: FinanceEntryCategory.cortesia) — nesse caso, e só nesse
  // caso, quem chama pode pedir o status final diretamente.
  status?: Extract<FinanceEntryStatus, "programado" | "pago">;
};

// Idempotente: chamar de novo com o mesmo auto_key devolve o lançamento já
// existente em vez de criar um duplicado ou lançar erro de constraint.
export async function createFinanceEntry(input: CreateFinanceEntryInput, db: Prisma.TransactionClient = prisma) {
  const existing = await db.financeEntry.findUnique({ where: { auto_key: input.auto_key } });
  if (existing) {
    return existing;
  }

  try {
    return await db.financeEntry.create({
      data: {
        type: input.type,
        category: input.category,
        status: input.status ?? "programado",
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
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const concurrent = await db.financeEntry.findUnique({ where: { auto_key: input.auto_key } });
      if (concurrent) return concurrent;
    }
    throw error;
  }
}

// Despesas e repasses ficam elegíveis no marco operacional. Recebimentos
// da venda ao cliente/parceiro admitem antecipação em createPayment.
export async function markFinanceEntryEligible(entryId: string) {
  // An atomic predicate prevents a concurrent settlement from being
  // overwritten by a retry of the operational completion event.
  await prisma.financeEntry.updateMany({
    where: { id: entryId, status: "programado", reversed_at: null },
    data: { status: "pendente", payment_eligible: true },
  });
  return prisma.financeEntry.findUniqueOrThrow({ where: { id: entryId } });
}

// Cancela um lançamento que ainda não gerou nenhum pagamento real — isto é
// um UPDATE de status (permitido), não uma reversão formal, porque nada
// foi de fato liquidado ainda. Uma vez que existir um Payment "pago", usar
// reverseFinanceEntry em vez desta função.
export async function cancelUnpaidFinanceEntry(entryId: string, db?: Prisma.TransactionClient): Promise<FinanceEntry> {
  if (!db) return prisma.$transaction((tx) => cancelUnpaidFinanceEntry(entryId, tx));
  await db.$queryRaw`SELECT id FROM finance_entries WHERE id = ${entryId}::uuid FOR UPDATE`;
  const entry = await db.financeEntry.findUniqueOrThrow({ where: { id: entryId }, include: { payments: { where: { reversed_at: null, estorno_of_id: null } }, compensacao: true } });
  if (entry.status === "pago" || entry.payments.length || (entry.compensacao?.status === "confirmada" && !entry.compensacao.reversed_at)) {
    throw new Error("Este lançamento já tem pagamento ou compensação registrado. Reverta a liquidação antes de cancelar.");
  }
  return db.financeEntry.update({ where: { id: entryId }, data: { status: "cancelado", payment_eligible: false } });
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
  occurred_at?: Date;
  dedupe_key: string;
  supplierRequest?: { id: string; reviewerId: string };
};

export async function createPayment(input: CreatePaymentInput) {
  const occurredAt = input.occurred_at ?? new Date();
  if (Number.isNaN(occurredAt.getTime()) || occurredAt.getTime() > new Date().getTime()) throw new Error("Data de pagamento inválida ou futura.");
  const existing = await prisma.payment.findUnique({ where: { dedupe_key: input.dedupe_key } });
  if (existing) {
    return existing;
  }

  try {
    return await prisma.$transaction(async (tx) => {
      if (input.supplierRequest) {
        await tx.$queryRaw`SELECT id FROM change_requests WHERE id = ${input.supplierRequest.id}::uuid FOR UPDATE`;
        const request = await tx.changeRequest.findUniqueOrThrow({ where: { id: input.supplierRequest.id } });
        const details = request.allocation_details as Record<string, unknown> | null;
        if (request.type !== "pagamento_repasse_fornecedor" || ["rejeitada", "concluida"].includes(request.status) || details?.entry_id !== input.finance_entry_id || Number(details?.amount) !== Number(input.amount)) throw new Error("O protocolo não está disponível ou não corresponde ao recebimento.");
      }
      const relation = await tx.financeEntry.findUniqueOrThrow({ where: { id: input.finance_entry_id }, select: { reservation_id: true } });
      if (relation.reservation_id) await tx.$queryRaw`SELECT id FROM reservations WHERE id = ${relation.reservation_id}::uuid FOR UPDATE`;
      // Serializa liquidações do mesmo título. Sem este lock, dois cliques
      // simultâneos podem ler o mesmo saldo e registrar pagamento acima do valor.
      await tx.$queryRaw`SELECT id FROM finance_entries WHERE id = ${input.finance_entry_id}::uuid FOR UPDATE`;

      const duplicate = await tx.payment.findUnique({ where: { dedupe_key: input.dedupe_key } });
      if (duplicate) return duplicate;

      const entry = await tx.financeEntry.findUniqueOrThrow({
        where: { id: input.finance_entry_id },
        include: { compensacao: true },
      });
      if (input.supplierRequest) {
        const request = await tx.changeRequest.findUniqueOrThrow({ where: { id: input.supplierRequest.id } });
        const service = entry.service_id ? await tx.service.findUnique({ where: { id: entry.service_id }, include: { direct_collections: true } }) : null;
        if (entry.party_type !== "fornecedor" || entry.party_id !== request.company_id || entry.reservation_id !== request.reservation_id || entry.type !== "receita" || entry.category !== "repasse_fornecedor" || !service || service.supplier_id !== request.company_id || service.collection_actor !== "fornecedor" || service.execution_status !== "concluido" || !service.direct_collections.some(c => c.status === "received" && !c.reversed_at && c.financial_responsible_id === request.company_id)) throw new Error("O recebimento não corresponde à cobrança direta confirmada deste fornecedor.");
      }
      if (!canRegisterEntryPayment(entry)) {
        throw new Error("Este lançamento não está elegível para pagamento.");
      }
      if (isReservationSale(entry)) {
        const service = await tx.service.findUniqueOrThrow({ where: { id: entry.service_id! }, include: { reservation: true } });
        const reservation = service.reservation;
        const partner = reservation.collection_mode === "faturado";
        const expectedParty = partner ? reservation.origin_partner_id : reservation.client_id;
        if (service.reservation_id !== entry.reservation_id || service.execution_status === "cancelado" || service.acceptance_status === "recusado" || ["cancelado", "rejeitado"].includes(reservation.status) || reservation.is_cortesia || reservation.collection_mode === "direto" || entry.party_id !== expectedParty || entry.party_type !== (partner ? "parceiro" : "cliente")) {
          throw new Error("A venda não está disponível para recebimento nesta reserva. Confira o responsável pela cobrança e o status do serviço.");
        }
      }
      if (input.type !== (entry.type === "receita" ? "recebimento" : "pagamento")) {
        throw new Error("O sentido do pagamento não corresponde ao lançamento.");
      }
      if (input.bank_account_id) {
        await tx.$queryRaw`SELECT id FROM bank_accounts WHERE id = ${input.bank_account_id}::uuid FOR UPDATE`;
        const account = await tx.bankAccount.findUnique({ where: { id: input.bank_account_id }, select: { active: true } });
        if (!account?.active) throw new Error("Selecione uma conta bancária ativa.");
        const { start } = businessDay(occurredAt);
        if (await tx.cashClosing.findFirst({ where: { bank_account_id: input.bank_account_id, closing_date: { gte: start }, reopened_at: null } })) throw new Error("Existe um caixa fechado nessa data ou depois dela. Reabra os fechamentos afetados antes de registrar a movimentação retroativa.");
      }

      const amount = new Prisma.Decimal(input.amount);
      if (!amount.isPositive()) throw new Error("O valor do pagamento deve ser maior que zero.");

      const paid = await tx.payment.aggregate({
        where: { finance_entry_id: input.finance_entry_id, reversed_at: null, estorno_of_id: null },
        _sum: { amount: true },
      });
      const paidAmount = paid._sum.amount ?? new Prisma.Decimal(0);
      const compensatedAmount =
        entry.compensacao && entry.compensacao.status === "confirmada" && !entry.compensacao.reversed_at
          ? Prisma.Decimal.min(entry.amount, entry.compensacao.amount)
          : new Prisma.Decimal(0);
      const remaining = entry.amount.minus(paidAmount).minus(compensatedAmount);
      if (remaining.lte(0)) throw new Error("Este lançamento já está totalmente liquidado.");
      if (amount.gt(remaining)) {
        throw new Error(`O pagamento não pode ultrapassar o saldo de R$ ${remaining.toFixed(2)}.`);
      }

      const payment = await tx.payment.create({
        data: {
          finance_entry_id: input.finance_entry_id,
          type: input.type,
          amount,
          payment_method: input.payment_method,
          bank_account_id: input.bank_account_id,
          receipt_url: input.receipt_url,
          occurred_at: occurredAt,
          dedupe_key: input.dedupe_key,
        },
      });

      const fullyPaid = paidAmount.plus(compensatedAmount).plus(amount).gte(entry.amount);
      await tx.financeEntry.update({
        where: { id: input.finance_entry_id },
        data: { status: fullyPaid ? "pago" : "pendente", payment_eligible: !fullyPaid },
      });

      if (input.supplierRequest) {
        const request = await tx.changeRequest.findUniqueOrThrow({ where: { id: input.supplierRequest.id } });
        await tx.changeRequest.update({ where: { id: request.id }, data: {
          status: "pago", reviewed_by_id: input.supplierRequest.reviewerId, reviewed_at: new Date(),
          response_note: "Repasse recebido pela Nativos e registrado no lançamento financeiro vinculado.",
          allocation_details: { ...(request.allocation_details as Prisma.JsonObject), payment_id: payment.id },
        } });
        if (fullyPaid && entry.service_id) {
          const originalRequest = await tx.changeRequest.findUnique({ where: { dedupe_key: `direct-repasse:${entry.service_id}` } });
          if (originalRequest && !["rejeitada", "concluida"].includes(originalRequest.status)) {
            await tx.changeRequest.update({ where: { id: originalRequest.id }, data: { status: "concluida", reviewed_by_id: input.supplierRequest.reviewerId, reviewed_at: new Date(), response_note: `Saldo do serviço liquidado pelo protocolo ${request.protocol}.`, allocation_details: { ...(originalRequest.allocation_details as Prisma.JsonObject), payment_request_id: request.id, payment_id: payment.id } } });
            await tx.auditLog.create({ data: { actor_id: input.supplierRequest.reviewerId, action: "repasse_direto_liquidado", entity_type: "change_request", entity_id: originalRequest.id, metadata: { paymentId: payment.id, paymentRequestId: request.id, entryId: entry.id } } });
          }
        }
        await tx.auditLog.create({ data: { actor_id: input.supplierRequest.reviewerId, action: "repasse_fornecedor_confirmado", entity_type: "change_request", entity_id: request.id, metadata: { entryId: entry.id, serviceId: entry.service_id, reservationId: entry.reservation_id, paymentId: payment.id, amount: amount.toString() } } });
      }
      return payment;
    });
  } catch (error) {
    // A unique key é a última barreira para retries concorrentes. Se outra
    // requisição venceu a corrida, devolvemos exatamente o pagamento criado.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const duplicate = await prisma.payment.findUnique({ where: { dedupe_key: input.dedupe_key } });
      if (duplicate) return duplicate;
    }
    throw error;
  }
}

export async function reversePayment(
  paymentId: string,
  params: { actorId: string; reason: string; dedupeKey: string; audit?: boolean },
) {
  if (!params.reason.trim()) throw new Error("Informe o motivo do estorno.");

  const existingReversal = await prisma.payment.findUnique({ where: { dedupe_key: params.dedupeKey } });
  if (existingReversal) return existingReversal;

  try {
    return await prisma.$transaction(async (tx) => {
      // Serializa o estorno com novos pagamentos do mesmo título.
      await tx.$queryRaw`SELECT id FROM payments WHERE id = ${paymentId}::uuid FOR UPDATE`;
      const original = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });

      if (original.estorno_of_id) throw new Error("Um estorno não pode ser estornado diretamente.");
      if (original.reversed_at) {
        const reversal = await tx.payment.findFirst({ where: { estorno_of_id: paymentId } });
        if (reversal) return reversal;
        throw new Error("Pagamento já estornado sem contrapartida localizada.");
      }

      const relation = await tx.financeEntry.findUniqueOrThrow({ where: { id: original.finance_entry_id }, select: { reservation_id: true } });
      if (relation.reservation_id) await tx.$queryRaw`SELECT id FROM reservations WHERE id = ${relation.reservation_id}::uuid FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM finance_entries WHERE id = ${original.finance_entry_id}::uuid FOR UPDATE`;
      if (original.reconciled) throw new Error("Este pagamento já foi conciliado. Revise a conciliação antes de estornar.");
      if (original.bank_account_id) {
        await tx.$queryRaw`SELECT id FROM bank_accounts WHERE id = ${original.bank_account_id}::uuid FOR UPDATE`;
        const closing = await tx.cashClosing.findFirst({ where: {
          bank_account_id: original.bank_account_id, reopened_at: null,
          closing_date: { gte: businessDay(effectivePaymentDate(original)).start },
        }, select: { id: true } });
        if (closing) throw new Error("Este pagamento pertence a um caixa fechado. Revise o fechamento antes de estornar.");
      }

      const duplicate = await tx.payment.findUnique({ where: { dedupe_key: params.dedupeKey } });
      if (duplicate) return duplicate;

      await tx.payment.update({
        where: { id: paymentId },
        data: {
          reversed_at: new Date(),
          reversed_by_id: params.actorId,
          reversal_reason: params.reason.trim(),
        },
      });

      const reversal = await tx.payment.create({
        data: {
          finance_entry_id: original.finance_entry_id,
          type: original.type === "recebimento" ? "pagamento" : "recebimento",
          amount: original.amount,
          payment_method: original.payment_method,
          bank_account_id: original.bank_account_id,
          estorno_of_id: paymentId,
          dedupe_key: params.dedupeKey,
        },
      });

      const [entry, activePayments] = await Promise.all([
        tx.financeEntry.findUniqueOrThrow({
          where: { id: original.finance_entry_id },
          include: { compensacao: true },
        }),
        tx.payment.aggregate({
          where: {
            finance_entry_id: original.finance_entry_id,
            reversed_at: null,
            estorno_of_id: null,
          },
          _sum: { amount: true },
        }),
      ]);
      const activeAmount = activePayments._sum.amount ?? new Prisma.Decimal(0);
      const compensatedAmount =
        entry.compensacao && entry.compensacao.status === "confirmada" && !entry.compensacao.reversed_at
          ? Prisma.Decimal.min(entry.amount, entry.compensacao.amount)
          : new Prisma.Decimal(0);
      const fullyPaid = activeAmount.plus(compensatedAmount).gte(entry.amount);
      const unavailable = Boolean(entry.reversed_at) || entry.status === "cancelado";

      await tx.financeEntry.update({
        where: { id: original.finance_entry_id },
        data: {
          status: unavailable ? "cancelado" : fullyPaid ? "pago" : "pendente",
          payment_eligible: unavailable ? false : !fullyPaid,
        },
      });

      if (params.audit) await tx.auditLog.create({ data: {
        actor_id: params.actorId, action: "pagamento_estornado", entity_type: "payment", entity_id: paymentId,
        metadata: { reason: params.reason.trim(), reversal_id: reversal.id, amount: original.amount.toString() },
      } });
      return reversal;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const duplicate = await prisma.payment.findUnique({ where: { dedupe_key: params.dedupeKey } });
      if (duplicate) return duplicate;
    }
    throw error;
  }
}

type CreateDirectCollectionInput = {
  service_id: string;
  receiver_type: DirectCollectionReceiverType;
  receiver_id: string;
  financial_responsible_type: FinancialResponsibleType;
  financial_responsible_id: string;
  amount: Prisma.Decimal.Value;
  receipt_url?: string | null;
  idempotency_key: string;
  status?: DirectCollectionStatus;
  not_received_reason_id?: string | null;
};

export async function createDirectCollection(input: CreateDirectCollectionInput) {
  const existing = await prisma.directCollection.findUnique({
    where: { idempotency_key: input.idempotency_key },
  });
  if (existing) {
    if (existing.reversed_at) throw new Error("Esta confirmação foi revertida e precisa de uma nova análise financeira.");
    if (existing.service_id !== input.service_id || existing.receiver_id !== input.receiver_id) {
      throw new Error("A confirmação existente pertence a outro responsável.");
    }
    return prisma.directCollection.update({
      where: { id: existing.id },
      data: {
        status: input.status ?? existing.status,
        not_received_reason_id: input.not_received_reason_id ?? null,
        amount: input.amount,
        receipt_url: input.receipt_url ?? existing.receipt_url,
      },
    });
  }

  return prisma.directCollection.create({
    data: {
      service_id: input.service_id,
      receiver_type: input.receiver_type,
      receiver_id: input.receiver_id,
      financial_responsible_type: input.financial_responsible_type,
      financial_responsible_id: input.financial_responsible_id,
      amount: input.amount,
      receipt_url: input.receipt_url ?? null,
      status: input.status ?? "pending",
      not_received_reason_id: input.not_received_reason_id,
      idempotency_key: input.idempotency_key,
    },
  });
}

type CreateCompensationInput = {
  counterparty_type: CompensationCounterpartyType;
  counterparty_id: string;
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

  try {
    return await prisma.$transaction(async (tx) => {
      const entryIds = [...new Set(input.entryIds)];
      const amount = new Prisma.Decimal(input.amount);
      if (entryIds.length !== 2) {
        throw new Error("A compensação exige exatamente um lançamento a pagar e um a receber.");
      }
      if (!amount.isPositive()) {
        throw new Error("O valor da compensação deve ser maior que zero.");
      }

      const relations = await tx.financeEntry.findMany({ where: { id: { in: entryIds } }, select: { reservation_id: true } });
      const reservationIds = [...new Set(relations.map((entry) => entry.reservation_id).filter((id): id is string => Boolean(id)))].sort();
      for (const id of reservationIds) await tx.$queryRaw`SELECT id FROM reservations WHERE id = ${id}::uuid FOR UPDATE`;
      // Serializa compensações e pagamentos concorrentes dos mesmos títulos.
      await tx.$queryRaw`
        SELECT id
        FROM finance_entries
        WHERE id = ANY(ARRAY[${Prisma.join(entryIds)}]::uuid[])
        ORDER BY id
        FOR UPDATE
      `;

      const entries = await tx.financeEntry.findMany({
        where: { id: { in: entryIds }, reversed_at: null },
      });
      if (entries.length !== entryIds.length) {
        throw new Error("Um ou mais lançamentos da compensação não foram encontrados.");
      }
      if (
        entries.some(
          (entry) =>
            entry.party_id !== input.counterparty_id ||
            entry.compensacao_id ||
            entry.status === "cancelado" ||
            entry.status === "programado",
        )
      ) {
        throw new Error("Os lançamentos não pertencem à mesma contraparte ou já foram compensados.");
      }

      const payable = entries.find((entry) => entry.type === "despesa");
      const receivable = entries.find((entry) => entry.type === "receita");
      if (!payable || !receivable) {
        throw new Error("A compensação exige obrigações financeiras de tipos opostos.");
      }

      const expectedPartyType = input.counterparty_type === "supplier" ? "fornecedor" : "motorista";
      if (entries.some((entry) => entry.party_type !== expectedPartyType)) {
        throw new Error("O tipo da contraparte não corresponde aos lançamentos informados.");
      }

      const paymentGroups = await tx.payment.groupBy({
        by: ["finance_entry_id"],
        where: {
          finance_entry_id: { in: entryIds },
          reversed_at: null,
          estorno_of_id: null,
        },
        _sum: { amount: true },
      });
      const paidByEntry = new Map(
        paymentGroups.map((group) => [group.finance_entry_id, group._sum.amount ?? new Prisma.Decimal(0)]),
      );
      const maxCompensable = Prisma.Decimal.min(
        payable.amount.minus(paidByEntry.get(payable.id) ?? 0),
        receivable.amount.minus(paidByEntry.get(receivable.id) ?? 0),
      );
      if (maxCompensable.lte(0) || amount.gt(maxCompensable)) {
        throw new Error(`A compensação não pode ultrapassar o saldo comum de R$ ${maxCompensable.toFixed(2)}.`);
      }

      const compensation = await tx.compensation.create({
        data: {
          counterparty_type: input.counterparty_type,
          counterparty_id: input.counterparty_id,
          payable_allocation: { finance_entry_id: payable.id, amount: amount.toString() },
          receivable_allocation: { finance_entry_id: receivable.id, amount: amount.toString() },
          amount,
          idempotency_key: input.idempotency_key,
        },
      });

      for (const entry of entries) {
        const paidAmount = paidByEntry.get(entry.id) ?? new Prisma.Decimal(0);
        const compensatedAmount = Prisma.Decimal.min(entry.amount, amount);
        const fullySettled = paidAmount.plus(compensatedAmount).gte(entry.amount);

        await tx.financeEntry.update({
          where: { id: entry.id },
          data: {
            compensacao_id: compensation.id,
            status: fullySettled ? "pago" : "pendente",
            payment_eligible: !fullySettled,
          },
        });
      }

      return compensation;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const concurrent = await prisma.compensation.findUnique({
        where: { idempotency_key: input.idempotency_key },
      });
      if (concurrent) return concurrent;
    }
    throw error;
  }
}
