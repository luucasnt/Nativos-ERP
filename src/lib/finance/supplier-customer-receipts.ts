import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parsePaymentDate } from "@/lib/finance/payment-date";
import { voucherFinancialSummary } from "@/lib/documents/voucher-finance";

// Passenger money held by the supplier is an operational receipt, never a Nativos Payment.
export async function recordSupplierCustomerReceipt(input: { serviceId: string; companyId: string; actorId: string; amount: number; paymentDate: string; receiptUrl?: string; dedupeKey: string }) {
  const amount = new Prisma.Decimal(input.amount);
  if (!amount.isPositive() || amount.decimalPlaces() > 2) throw new Error("Informe um valor positivo com até duas casas decimais.");
  const occurredAt = parsePaymentDate(input.paymentDate);
  const relation = await prisma.service.findUniqueOrThrow({ where: { id: input.serviceId }, select: { reservation_id: true } });
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM reservations WHERE id = ${relation.reservation_id}::uuid FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM services WHERE id = ${input.serviceId}::uuid FOR UPDATE`;
    const service = await tx.service.findUniqueOrThrow({ where: { id: input.serviceId }, include: { reservation: true } });
    if (service.reservation_id !== relation.reservation_id || service.supplier_id !== input.companyId || service.collection_actor !== "fornecedor" || service.execution_status !== "concluido" || service.acceptance_status !== "aceito" || service.reservation.is_cortesia || ["cancelado", "rejeitado"].includes(service.reservation.status)) throw new Error("Selecione um serviço concluído de cobrança direta da sua empresa.");
    const key = `supplier-customer:${input.serviceId}:${input.dedupeKey}`;
    const existing = await tx.directCollection.findUnique({ where: { idempotency_key: key } });
    if (existing) {
      if (existing.reversed_at || existing.financial_responsible_id !== input.companyId || !existing.customer_amount?.equals(amount) || existing.occurred_at?.getTime() !== occurredAt.getTime()) throw new Error("Este registro já existe com outros dados. Atualize a tela.");
      return existing;
    }
    const reservation = await tx.reservation.findUniqueOrThrow({ where: { id: relation.reservation_id }, include: {
      finance_entries: { where: { type: "receita", category: "venda_servico", party_type: "cliente", reversed_at: null, estorno_of_id: null, status: { not: "cancelado" } }, include: { payments: { where: { reversed_at: null, estorno_of_id: null, type: "recebimento" } } } },
      services: { orderBy: [{ scheduled_date: "asc" }, { scheduled_time: "asc" }, { id: "asc" }], include: { direct_collections: { where: { status: "received", reversed_at: null, customer_amount: { not: null } } } } },
    } });
    const balance = voucherFinancialSummary(reservation).serviceBalances.find(b => b.service.id === input.serviceId)?.remaining;
    if (!balance || amount.gt(balance)) throw new Error(`O valor supera o saldo do passageiro de R$ ${balance?.toFixed(2) ?? "0,00"}.`);
    const receipt = await tx.directCollection.create({ data: { service_id: input.serviceId, receiver_type: "fornecedor", receiver_id: input.companyId, financial_responsible_type: "company", financial_responsible_id: input.companyId, amount, customer_amount: amount, occurred_at: occurredAt, status: "received", receipt_url: input.receiptUrl ?? null, idempotency_key: key } });
    await tx.auditLog.create({ data: { actor_id: input.actorId, action: "recebimento_passageiro_registrado_pelo_fornecedor", entity_type: "service", entity_id: input.serviceId, metadata: { direct_collection_id: receipt.id, customer_amount: amount.toString(), payment_date: input.paymentDate, financial_effect: "supplier_only" } } });
    return receipt;
  }, { maxWait: 10000, timeout: 30000 });
}
