export const FINANCE_ENTRY_TYPE_LABEL: Record<string, string> = {
  receita: "Receita",
  despesa: "Despesa",
};

export const FINANCE_ENTRY_STATUS_LABEL: Record<string, string> = {
  programado: "Programado",
  pendente: "Pendente",
  pago: "Pago",
  vencido: "Vencido",
  cancelado: "Cancelado",
};

export const FINANCE_ENTRY_CATEGORY_LABEL: Record<string, string> = {
  venda_servico: "Venda de serviço",
  recebimento_cliente: "Recebimento do cliente",
  pagamento_fornecedor: "Pagamento a fornecedor",
  repasse_fornecedor: "Repasse ao fornecedor",
  comissao_parceiro: "Comissão de parceiro",
  comissao_indicacao: "Comissão de indicação",
  repasse_motorista: "Repasse ao motorista",
  recebido_direto_motorista: "Recebido direto pelo motorista",
  despesa_servico: "Despesa do serviço",
  hora_extra: "Hora extra",
  km_extra: "Km extra",
  ajuste: "Ajuste",
  ajuste_manual: "Ajuste manual",
  estorno: "Estorno",
  transferencia_interna: "Transferência interna",
  imposto: "Imposto",
  outro: "Outro",
};

export const FINANCE_PARTY_TYPE_LABEL: Record<string, string> = {
  cliente: "Cliente",
  motorista: "Motorista",
  fornecedor: "Fornecedor",
  parceiro: "Parceiro",
  interno: "Interno",
  pessoa_fisica: "Pessoa física",
};

export const SERVICE_EXPENSE_STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  pix: "Pix",
  cartao: "Cartão",
  dinheiro: "Dinheiro",
  transferencia: "Transferência",
  boleto: "Boleto",
  outro: "Outro",
};
