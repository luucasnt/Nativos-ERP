type PaymentEntry = {
  type: string; category: string; party_type: string; reservation_id: string | null;
  service_id: string | null; status: string; reversed_at: Date | null; payment_eligible: boolean;
};

// Recebimentos da venda são permitidos antes da execução. Despesas e repasses
// continuam dependendo do marco operacional que libera payment_eligible.
export function isReservationSale(entry: PaymentEntry) {
  return entry.type === "receita" && entry.category === "venda_servico" &&
    ["cliente", "parceiro"].includes(entry.party_type) && Boolean(entry.reservation_id && entry.service_id);
}
export function canRegisterEntryPayment(entry: PaymentEntry) {
  return !entry.reversed_at && !["cancelado", "pago"].includes(entry.status) &&
    (entry.payment_eligible || (entry.status === "programado" && isReservationSale(entry)));
}
