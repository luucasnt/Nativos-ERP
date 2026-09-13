// Rótulo legível por tipo de ChangeRequest — o campo `type` é texto livre
// (ver comentário do model no schema.prisma), sem enum próprio no banco.
export const CHANGE_REQUEST_TYPE_LABEL: Record<string, string> = {
  nova_reserva: "Nova reserva",
  alteracao: "Alteração",
  cancelamento: "Cancelamento",
  pagamento_fatura: "Pagamento de fatura",
  repasse_nativos: "Repasse",
  repasse_motorista: "Repasse",
  contestacao_valor: "Contestação de valor",
  troca_recurso: "Troca de recurso",
  cadastro_motorista: "Cadastro de motorista",
  cadastro_veiculo: "Cadastro de veículo",
  correcao_horario: "Correção de horário",
  correcao_informacao: "Correção de informação",
  antecipacao_fatura: "Antecipação de fatura",
  outro: "Outro",
};

export function changeRequestTypeLabel(type: string) {
  return CHANGE_REQUEST_TYPE_LABEL[type] ?? type;
}
