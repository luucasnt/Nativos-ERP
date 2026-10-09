import { Prisma } from "@prisma/client";
import { formatCurrency } from "@/lib/documents/format";
type CollectionService = {
  type?: string; price: Prisma.Decimal | string; collection_actor: string;
  driver_can_receive_payment: boolean; execution_status: string; acceptance_status: string;
  reservation: { status: string; is_cortesia: boolean; collection_mode: string };
  finance_entries: Array<{ type: string; category: string; party_type: string; payments: Array<{ amount: Prisma.Decimal | string; type: string }> }>;
  direct_collections: Array<{ status: string }>;
};
export function workOrderCollection(service: CollectionService) {
  if (service.execution_status === "cancelado" || service.acceptance_status === "recusado" || ["cancelado", "rejeitado"].includes(service.reservation.status)) return "Serviço indisponível para cobrança. Consulte a operação Nativos.";
  if (service.reservation.is_cortesia) return "Serviço de cortesia. Não cobrar do passageiro.";
  if (service.reservation.collection_mode === "faturado") return "Pagamento tratado com o parceiro responsável. Não cobrar do passageiro.";
  const direct = service.reservation.collection_mode === "direto";
  if (!direct && !service.driver_can_receive_payment) return "Não realizar cobrança ao passageiro. O pagamento é tratado pela Nativos. Em caso de dúvida, acione nossa equipe.";
  const paid = service.finance_entries.filter(entry => entry.type === "receita" && entry.category === "venda_servico" && entry.party_type === "cliente").flatMap(entry => entry.payments).filter(payment => payment.type === "recebimento").reduce((sum, payment) => sum.plus(payment.amount), new Prisma.Decimal(0));
  const alreadyReceivedDirect = service.direct_collections.some(collection => collection.status === "received");
  const remaining = alreadyReceivedDirect ? new Prisma.Decimal(0) : Prisma.Decimal.max(0, new Prisma.Decimal(service.price).minus(paid));
  if (remaining.isZero()) return "Serviço já pago. Não cobrar novamente do passageiro.";
  const receiver = direct && service.collection_actor === "fornecedor" ? "Motorista/fornecedor" : "Motorista";
  return `${receiver} deve receber diretamente do cliente: ${formatCurrency(remaining)}. ${paid.gt(0) ? "Valor restante após os pagamentos antecipados registrados. " : ""}Confirme o recebimento com a operação e registre-o no sistema. Este é o valor do passageiro, não o repasse à Nativos.`;
}
