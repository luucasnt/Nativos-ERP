import type { RecipientType } from "@prisma/client";

const POLICY: Record<string, readonly RecipientType[]> = {
  fornecedor_novo_servico: ["fornecedor"],
  motorista_servico_atribuido: ["motorista"],
  acesso_portal: ["parceiro", "fornecedor", "motorista"],
  voucher_cliente: ["cliente", "parceiro"],
  cobranca_parceiro: ["parceiro"],
  fatura_fechada: ["parceiro"],
  pagamento_confirmado: ["parceiro", "fornecedor", "motorista"],
  documento_disponivel: ["parceiro", "fornecedor", "motorista"],
};

export function allowedRecipientTypes(templateKey: string): readonly RecipientType[] {
  return POLICY[templateKey] ?? ["parceiro", "fornecedor", "motorista", "interno"];
}

export function assertEmailRecipientAllowed(templateKey: string, recipientType: RecipientType) {
  if (!allowedRecipientTypes(templateKey).includes(recipientType)) {
    if (recipientType === "cliente") {
      throw new Error("O passageiro só pode receber por e-mail a confirmação da reserva com voucher.");
    }
    throw new Error("Este modelo não pode ser enviado para o tipo de destinatário selecionado.");
  }
}

export function voucherRecipientForReservation(input: {
  client: { name: string; email: string | null };
  originPartner: { name: string; contact_email: string | null; portal_email: string | null } | null;
}) {
  if (input.originPartner) {
    return {
      type: "parceiro" as const,
      name: input.originPartner.name,
      email: input.originPartner.contact_email ?? input.originPartner.portal_email,
      reason: "O parceiro conduz o atendimento do passageiro nesta reserva.",
    };
  }
  return {
    type: "cliente" as const,
    name: input.client.name,
    email: input.client.email,
    reason: "A Nativos conduz o atendimento direto do passageiro nesta reserva.",
  };
}
