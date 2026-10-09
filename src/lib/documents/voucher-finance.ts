import { Prisma } from "@prisma/client";

type Amount = Prisma.Decimal | string | number;
type VoucherFinanceInput = {
  client_id: string;
  is_cortesia: boolean;
  collection_mode: string;
  services: Array<{ id: string; price: Amount; execution_status: string; acceptance_status: string; direct_collections: Array<{ amount: Amount }> }>;
  finance_entries: Array<{ party_id: string | null; service_id: string | null; payments: Array<{ amount: Amount; type: string }> }>;
};

// O loader fornece somente vendas ao cliente e recebimentos não estornados.
// Repasses de fornecedores/motoristas, comissões e despesas nunca entram aqui.
export function voucherFinancialSummary(reservation: VoucherFinanceInput) {
  const services = reservation.services.filter(service => service.execution_status !== "cancelado" && service.acceptance_status !== "recusado");
  const total = reservation.is_cortesia ? new Prisma.Decimal(0) : services.reduce((sum, service) => sum.plus(service.price), new Prisma.Decimal(0));
  const ids = new Set(services.map(service => service.id));
  const nativosPaid = reservation.finance_entries.filter(entry => entry.party_id === reservation.client_id && (entry.service_id === null || ids.has(entry.service_id))).flatMap(entry => entry.payments).filter(payment => payment.type === "recebimento").reduce((sum, payment) => sum.plus(payment.amount), new Prisma.Decimal(0));
  // DirectCollection.amount é o repasse líquido à Nativos, não o valor recebido do passageiro.
  // O status received confirma a cobrança integral do preço deste serviço.
  const directPaid = services.reduce((sum, service) => service.direct_collections.length > 0 ? sum.plus(reservation.is_cortesia ? 0 : service.price) : sum, new Prisma.Decimal(0));
  const paid = nativosPaid.plus(directPaid);
  return { total, paid, remaining: Prisma.Decimal.max(0, total.minus(paid)), credit: Prisma.Decimal.max(0, paid.minus(total)), partnerBilling: reservation.collection_mode === "faturado" };
}
