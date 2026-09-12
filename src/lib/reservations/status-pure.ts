import type { ReservationStatus, ServiceAcceptanceStatus, ServiceExecutionStatus } from "@prisma/client";

export type ServiceStatusSlice = {
  acceptance_status: ServiceAcceptanceStatus;
  execution_status: ServiceExecutionStatus;
};

// INFERIDO (sinalizado desde a Fase 1): a especificação diz que
// Reservation.status é "calculado automaticamente a partir dos serviços
// vinculados", sem detalhar o algoritmo. Regra adotada, por ordem de
// precedência:
//   1. Sem serviços -> aguardando_confirmacao.
//   2. Todos os serviços cancelados -> cancelada.
//   3. Todos os serviços não cancelados estão concluídos -> concluida
//      (ou parcialmente_cancelada, se havia algum cancelado no meio).
//   4. Algum serviço não cancelado já iniciado ou concluído, mas nem todos
//      concluídos -> em_andamento.
//   5. Algum serviço aguardando aceite do fornecedor ou recusado -> volta
//      para aguardando_confirmacao (recusado exige reatribuição manual).
//   6. Caso contrário (tudo agendado e aceito) -> confirmada.
export function computeReservationStatus(services: ServiceStatusSlice[]): ReservationStatus {
  if (services.length === 0) {
    return "aguardando_confirmacao";
  }

  const active = services.filter((s) => s.execution_status !== "cancelado");
  const someCancelled = active.length < services.length;

  if (active.length === 0) {
    return "cancelada";
  }

  const allConcluded = active.every((s) => s.execution_status === "concluido");
  if (allConcluded) {
    return someCancelled ? "parcialmente_cancelada" : "concluida";
  }

  const anyStarted = active.some(
    (s) => s.execution_status === "em_andamento" || s.execution_status === "concluido",
  );
  if (anyStarted) {
    return "em_andamento";
  }

  const needsAttention = active.some(
    (s) => s.acceptance_status === "aguardando_aceite" || s.acceptance_status === "recusado",
  );
  if (needsAttention) {
    return "aguardando_confirmacao";
  }

  return "confirmada";
}
