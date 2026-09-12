import type { ReservationStatus, ServiceAcceptanceStatus, ServiceExecutionStatus } from "@prisma/client";

export type ServiceStatusSlice = {
  acceptance_status: ServiceAcceptanceStatus;
  execution_status: ServiceExecutionStatus;
};

export type ReservationStatusResult = {
  status: ReservationStatus;
  has_partial_cancellation: boolean;
};

// INFERIDO (sinalizado desde a Fase 1, enum e mapeamento confirmados pelo
// cliente na revisão da Fase 3): a especificação diz que Reservation.status
// é "calculado automaticamente a partir dos serviços vinculados", sem
// detalhar o algoritmo. Enum aprovado: rascunho, pendente, confirmado,
// em_andamento, concluido, cancelado, rejeitado.
//
// Regras de status, por ordem de precedência (a primeira que bater decide):
//   1. Sem serviços -> rascunho.
//   2. Todos os serviços cancelados -> cancelado.
//   3. Todos os serviços não cancelados estão concluídos -> concluido.
//   4. Algum serviço não cancelado já iniciado ou concluído, mas nem todos
//      concluídos -> em_andamento.
//   5. Algum serviço não cancelado aguardando aceite do fornecedor OU
//      recusado -> pendente (uma recusa não tem status próprio — cai no
//      mesmo "precisa de atenção" de quem ainda não foi aceito, porque as
//      duas situações pedem a mesma ação: o admin reatribuir e seguir).
//   6. Caso contrário (tudo agendado e aceito) -> confirmado.
//
// "rejeitado" não é alcançado por este algoritmo — fica reservado para uma
// ação manual de rejeitar a reserva inteira (ainda não construída).
//
// has_partial_cancellation é um sinal independente, sempre calculado junto
// com o status mas sem influenciar as regras acima (exceto no caso 2, onde
// cancelamento total não conta como "parcial"): true sempre que existe pelo
// menos um serviço cancelado E pelo menos um não cancelado na mesma reserva.
export function computeReservationStatus(services: ServiceStatusSlice[]): ReservationStatusResult {
  if (services.length === 0) {
    return { status: "rascunho", has_partial_cancellation: false };
  }

  const hasCancelled = services.some((s) => s.execution_status === "cancelado");
  const hasNonCancelled = services.some((s) => s.execution_status !== "cancelado");
  const has_partial_cancellation = hasCancelled && hasNonCancelled;

  const active = services.filter((s) => s.execution_status !== "cancelado");

  if (active.length === 0) {
    return { status: "cancelado", has_partial_cancellation: false };
  }

  const allConcluded = active.every((s) => s.execution_status === "concluido");
  if (allConcluded) {
    return { status: "concluido", has_partial_cancellation };
  }

  const anyStarted = active.some(
    (s) => s.execution_status === "em_andamento" || s.execution_status === "concluido",
  );
  if (anyStarted) {
    return { status: "em_andamento", has_partial_cancellation };
  }

  const needsAttention = active.some(
    (s) => s.acceptance_status === "aguardando_aceite" || s.acceptance_status === "recusado",
  );
  if (needsAttention) {
    return { status: "pendente", has_partial_cancellation };
  }

  return { status: "confirmado", has_partial_cancellation };
}
