import type { AlertType } from "@prisma/client";

// INFERIDO: Alert não tem um campo "categoria" próprio (só `type`,
// `severity`, `entity_ref_type`) — a spec cataloga 17 tipos de exceção
// sem agrupá-los. Esse mapeamento existe só pra exibir uma etiqueta curta
// no painel de alertas da home (ex.: "Financeiro", "Operacional"), sem
// afetar nenhuma regra de negócio.
const CATEGORY_BY_TYPE: Partial<Record<AlertType, string>> = {
  fatura_vencida: "Financeiro",
  conta_vencida: "Financeiro",
  financeiro_inconsistente: "Financeiro",
  parceiro_proximo_limite: "Financeiro",
  parceiro_acima_limite: "Financeiro",
  despesa_motorista_pendente: "Despesa",
  solicitacao_alteracao: "Solicitação",
  solicitacao_cancelamento: "Solicitação",
  overbooking: "Operacional",
  conflito_motorista_veiculo: "Operacional",
  reserva_sem_recursos: "Operacional",
  fornecedor_recusou_sem_aceite: "Operacional",
  servico_atrasado: "Operacional",
  servico_nao_iniciado: "Operacional",
  sem_motorista: "Operacional",
};

export function alertCategoryLabel(type: AlertType) {
  return CATEGORY_BY_TYPE[type] ?? "Geral";
}
