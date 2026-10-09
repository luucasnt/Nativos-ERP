import { Prisma } from "@prisma/client";

type Amount = Prisma.Decimal | string | number;
type VoucherFinanceInput = {
  client_id: string; is_cortesia: boolean; collection_mode: string; status?: string;
  services: Array<{ id: string; price: Amount; execution_status: string; acceptance_status: string; driver_can_receive_payment?: boolean; driver?: { name: string } | null; direct_collections: Array<{ amount: Amount }> }>;
  finance_entries: Array<{ party_id: string | null; service_id: string | null; payments: Array<{ amount: Amount; type: string }> }>;
};

// Somente vendas e recebimentos válidos do cliente são fornecidos pelo loader.
// DirectCollection.amount é repasse líquido, não o valor pago pelo passageiro.
export function voucherFinancialSummary(reservation: VoucherFinanceInput) {
  const services = reservation.services.filter(service => service.execution_status !== "cancelado" && service.acceptance_status !== "recusado");
  const ids = new Set(services.map(service => service.id));
  const entries = reservation.finance_entries.filter(entry => entry.party_id === reservation.client_id && (entry.service_id === null || ids.has(entry.service_id)));
  const sumPayments = (serviceId: string | null) => entries.filter(entry => entry.service_id === serviceId).flatMap(entry => entry.payments).filter(payment => payment.type === "recebimento").reduce((sum, payment) => sum.plus(payment.amount), new Prisma.Decimal(0));
  const nativosPaid = entries.flatMap(entry => entry.payments).filter(payment => payment.type === "recebimento").reduce((sum, payment) => sum.plus(payment.amount), new Prisma.Decimal(0));
  let unallocated = sumPayments(null);
  let directPaid = new Prisma.Decimal(0);
  const serviceBalances = services.map((service, index) => {
    const price = new Prisma.Decimal(reservation.is_cortesia ? 0 : service.price);
    const advance = sumPayments(service.id);
    const share = Prisma.Decimal.min(unallocated, Prisma.Decimal.max(0, price.minus(advance)));
    unallocated = unallocated.minus(share);
    const paid = advance.plus(share);
    const directReceived = service.direct_collections.length > 0;
    const directRemainder = directReceived ? Prisma.Decimal.max(0, price.minus(paid)) : new Prisma.Decimal(0);
    directPaid = directPaid.plus(directRemainder);
    return { service, sequence: index + 1, paid: paid.plus(directRemainder), remaining: directReceived ? new Prisma.Decimal(0) : Prisma.Decimal.max(0, price.minus(paid)) };
  });
  const total = reservation.is_cortesia ? new Prisma.Decimal(0) : services.reduce((sum, service) => sum.plus(service.price), new Prisma.Decimal(0));
  const paid = nativosPaid.plus(directPaid);
  return { total, paid, remaining: Prisma.Decimal.max(0, total.minus(paid)), credit: Prisma.Decimal.max(0, paid.minus(total)), partnerBilling: reservation.collection_mode === "faturado", serviceBalances };
}

export function voucherPaymentInstructions(reservation: VoucherFinanceInput) {
  const finance = voucherFinancialSummary(reservation);
  if (["cancelado", "rejeitado"].includes(reservation.status ?? "")) return { heading: "Reserva encerrada", message: "Esta reserva não está ativa. Consulte nossa equipe antes de efetuar qualquer pagamento.", collections: [] };
  if (reservation.is_cortesia) return { heading: "Cortesia Nativos", message: "Os serviços desta reserva são oferecidos como cortesia. Não há pagamento a efetuar pelo passageiro.", collections: [] };
  if (finance.partnerBilling) return { heading: "Pagamento pelo parceiro", message: "A cobrança é tratada com o parceiro responsável pela reserva. Não efetue pagamento ao motorista por estes serviços.", collections: [] };
  if (finance.remaining.isZero()) return { heading: "Reserva quitada", message: "O pagamento desta reserva está integralmente registrado. Não é necessário pagar novamente ao motorista.", collections: [] };
  const collections = finance.serviceBalances.filter(item => item.remaining.gt(0)).map(item => ({
    sequence: item.sequence, amount: item.remaining,
    receiver: reservation.collection_mode === "direto" || item.service.driver_can_receive_payment ? "motorista" : "Nativos",
    driverName: item.service.driver?.name,
  }));
  const direct = collections.some(item => item.receiver === "motorista");
  return {
    heading: direct ? "Pagamento direto ao motorista" : "Pagamento à Nativos",
    message: direct ? "Efetue o pagamento do saldo indicado abaixo diretamente ao motorista responsável pelo respectivo serviço, conforme as condições acordadas com nossa equipe." : "O saldo deve ser pago à Nativos conforme as condições acordadas com nossa equipe. O motorista não está autorizado a receber por estes serviços.",
    collections,
  };
}
