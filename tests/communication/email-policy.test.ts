import { describe, expect, it } from "vitest";
import { assertEmailRecipientAllowed, voucherRecipientForReservation } from "@/lib/communication/email-policy";

describe("política de destinatários de e-mail", () => {
  it("permite ao passageiro somente o voucher", () => {
    expect(() => assertEmailRecipientAllowed("voucher_cliente", "cliente")).not.toThrow();
    expect(() => assertEmailRecipientAllowed("pagamento_confirmado", "cliente")).toThrow(/só pode receber/i);
    expect(() => assertEmailRecipientAllowed("cobranca_parceiro", "cliente")).toThrow(/só pode receber/i);
  });

  it("envia o voucher ao parceiro quando ele conduz o atendimento", () => {
    const recipient = voucherRecipientForReservation({
      client: { name: "Passageiro", email: "passageiro@example.com" },
      originPartner: { name: "Agência", contact_email: "agencia@example.com", portal_email: null },
    });
    expect(recipient).toMatchObject({ type: "parceiro", email: "agencia@example.com" });
  });

  it("envia o voucher ao passageiro quando a Nativos conduz o atendimento", () => {
    const recipient = voucherRecipientForReservation({
      client: { name: "Passageiro", email: "passageiro@example.com" },
      originPartner: null,
    });
    expect(recipient).toMatchObject({ type: "cliente", email: "passageiro@example.com" });
  });
});
