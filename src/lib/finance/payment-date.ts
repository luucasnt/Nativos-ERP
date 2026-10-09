import type { Prisma } from "@prisma/client";
export function bahiaDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bahia", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function parsePaymentDate(value: string, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Informe a data do recebimento ou pagamento.");
  const date = new Date(`${value}T00:00:00-03:00`);
  if (Number.isNaN(date.getTime()) || bahiaDate(date) !== value) throw new Error("Data de pagamento inválida.");
  if (value > bahiaDate(now)) throw new Error("A data do pagamento não pode estar no futuro.");
  return date;
}
export function effectivePaymentDate(payment: { occurred_at?: Date | null; created_at: Date }) {
  return payment.occurred_at ?? payment.created_at;
}
export function paymentDateWhere(range: Prisma.DateTimeFilter): Prisma.PaymentWhereInput {
  return { OR: [{ occurred_at: range }, { occurred_at: null, created_at: range }] };
}
