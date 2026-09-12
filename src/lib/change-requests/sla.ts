// SLA de resposta por categoria (spec seção 7): operacional = 30min,
// financeiro = 2h. Puro e sem estado — o prazo nunca é gravado no banco
// (ChangeRequest não tem um campo de deadline), sempre recalculado a
// partir de `created_at` + categoria, no momento de exibir.
import type { ChangeRequestCategory, ChangeRequestStatus } from "@prisma/client";

const SLA_MINUTES: Record<ChangeRequestCategory, number> = {
  operacional: 30,
  financeiro: 120,
};

// INFERIDO: a spec não lista os 12 tipos de ChangeRequest por categoria —
// só diz "operacional = 30min; financeiro = 2h". Mapeamento adotado:
// tudo que envolve dinheiro (repasse, fatura, contestação de valor) é
// financeiro; o resto (reserva, alteração, cancelamento, cadastro,
// correção de horário/informação, troca de recurso) é operacional.
const FINANCEIRO_TYPES = new Set([
  "pagamento_fatura",
  "repasse_nativos",
  "repasse_motorista",
  "contestacao_valor",
  "antecipacao_fatura",
]);

export function changeRequestCategoryForType(type: string): ChangeRequestCategory {
  return FINANCEIRO_TYPES.has(type) ? "financeiro" : "operacional";
}

export function computeChangeRequestDeadline(createdAt: Date, category: ChangeRequestCategory): Date {
  return new Date(createdAt.getTime() + SLA_MINUTES[category] * 60_000);
}

const OPEN_STATUSES = new Set<ChangeRequestStatus>(["solicitada", "em_analise"]);

// Só faz sentido estar "atrasada" enquanto a solicitação segue aberta —
// uma vez decidida (aprovada/rejeitada/concluída/etc.), o prazo de
// resposta já foi cumprido ou não, congelado no momento da decisão.
export function isChangeRequestOverdue(params: {
  createdAt: Date;
  category: ChangeRequestCategory;
  status: ChangeRequestStatus;
  now: Date;
}): boolean {
  if (!OPEN_STATUSES.has(params.status)) {
    return false;
  }
  return params.now.getTime() > computeChangeRequestDeadline(params.createdAt, params.category).getTime();
}
