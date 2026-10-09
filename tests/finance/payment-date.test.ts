import { renderToBuffer } from "@react-pdf/renderer";
import { loadReceiptData, ReceiptDocument } from "@/lib/documents/receipt";
import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bahiaDate, effectivePaymentDate, parsePaymentDate } from "@/lib/finance/payment-date";
import { prisma } from "@/lib/prisma";
import { createStandaloneManualEntry } from "@/lib/finance/manual-entry";
import { createPayment } from "@/lib/finance/ledger";
import { closeCash } from "@/lib/finance/cash-closing";
describe("data efetiva dos pagamentos", () => {
  it("valida datas reais, rejeita futuro e usa o dia da Bahia", () => {
    const now = new Date("2026-10-09T01:00:00Z");
    expect(bahiaDate(now)).toBe("2026-10-08");
    expect(parsePaymentDate("2026-10-07", now).toISOString()).toBe("2026-10-07T03:00:00.000Z");
    expect(() => parsePaymentDate("2026-02-30", now)).toThrow(/inválida/);
    expect(() => parsePaymentDate("2026-10-09", now)).toThrow(/futuro/);
    const old = new Date("2026-10-01T14:00:00Z");
    expect(effectivePaymentDate({ occurred_at: null, created_at: old })).toEqual(old);
  });
  it("lançamento retroativo preserva cadastro e entra no saldo histórico; fechamento posterior impede alteração", async () => {
    const actor = await prisma.user.create({ data: { auth_user_id: crypto.randomUUID(), email: `${crypto.randomUUID()}@date.test`, account_type: "internal", role: "admin" } });
    const account = await prisma.bankAccount.create({ data: { name: "Conta retroativa", type: "corrente", initial_balance: "100" } });
    const entry = await createStandaloneManualEntry({ type: "receita", party_type: "interno", amount: "500", description: "Recebimento retroativo" }, actor.id, crypto.randomUUID());
    const payment = await createPayment({ finance_entry_id: entry.id, type: "recebimento", amount: "200", payment_method: "pix", bank_account_id: account.id, occurred_at: new Date("2020-01-01T03:00:00Z"), dedupe_key: crypto.randomUUID() });
    expect(payment.created_at.getTime()).toBeGreaterThan(payment.occurred_at!.getTime());
    const pdf = await renderToBuffer(ReceiptDocument({ data: await loadReceiptData(payment.id) }));
    expect((pdf.toString("latin1").match(/\/Type \/Page\b/g) || []).length).toBe(1);
    if (process.env.PDF_REVIEW_DIR) { mkdirSync(process.env.PDF_REVIEW_DIR, { recursive: true }); writeFileSync(`${process.env.PDF_REVIEW_DIR}/recibo-retroativo.pdf`, pdf); }
    const closing = await closeCash(account.id, "300", actor.id, new Date("2020-01-02T12:00:00Z"));
    expect(closing.opening_balance.toFixed(2)).toBe("300.00");
    expect(closing.total_in.toFixed(2)).toBe("0.00");
    await expect(createPayment({ finance_entry_id: entry.id, type: "recebimento", amount: "100", payment_method: "pix", bank_account_id: account.id, occurred_at: new Date("2020-01-01T03:00:00Z"), dedupe_key: crypto.randomUUID() })).rejects.toThrow(/caixa fechado/);
  });
});
