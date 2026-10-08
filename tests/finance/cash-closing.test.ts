import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { businessDay, closeCash, reopenCash } from "@/lib/finance/cash-closing";
import { createStandaloneManualEntry } from "@/lib/finance/manual-entry";
import { createPayment, reversePayment } from "@/lib/finance/ledger";
let actorId: string;
beforeAll(async () => { actorId = (await prisma.user.create({ data: { auth_user_id: crypto.randomUUID(), email: `${crypto.randomUUID()}@closing.test`, account_type: "internal", is_owner: true } })).id; });
async function account() { return prisma.bankAccount.create({ data: { name: "Caixa teste", type: "caixa", initial_balance: 100 } }); }
async function entry() { return createStandaloneManualEntry({ type: "receita", description: "Recebimento", amount: "100", party_type: "interno" }, actorId, crypto.randomUUID()); }
describe("fechamento acumulado e protegido", () => {
  it("usa meia-noite da Bahia mesmo quando UTC já está no dia seguinte", () => { expect(businessDay(new Date("2026-10-09T01:30:00Z")).start.toISOString()).toBe("2026-10-08T03:00:00.000Z"); });
  it("transporta movimentos anteriores e usa precisão decimal", async () => {
    const a = await account(), e = await entry();
    await prisma.payment.create({ data: { finance_entry_id: e.id, bank_account_id: a.id, type: "recebimento", amount: 50.01, payment_method: "pix", dedupe_key: crypto.randomUUID(), created_at: new Date("2026-10-07T12:00:00Z") } });
    await prisma.payment.create({ data: { finance_entry_id: e.id, bank_account_id: a.id, type: "pagamento", amount: 10.02, payment_method: "pix", dedupe_key: crypto.randomUUID(), created_at: new Date("2026-10-08T12:00:00Z") } });
    const c = await closeCash(a.id, "139,99", actorId, new Date("2026-10-08T18:00:00Z"));
    expect(c.opening_balance.toFixed(2)).toBe("150.01"); expect(c.theoretical_balance.toFixed(2)).toBe("139.99"); expect(c.difference?.toFixed(2)).toBe("0.00");
  });
  it("não duplica fechamento, bloqueia movimentação e permite reabertura auditada", async () => {
    const a = await account(), e = await entry();
    const p = await createPayment({ finance_entry_id: e.id, bank_account_id: a.id, type: "recebimento", amount: 40, payment_method: "pix", dedupe_key: crypto.randomUUID() });
    const c = await closeCash(a.id, "140", actorId);
    await expect(closeCash(a.id, "140", actorId)).rejects.toThrow(/fechamento/);
    await expect(createPayment({ finance_entry_id: e.id, bank_account_id: a.id, type: "recebimento", amount: 20, payment_method: "pix", dedupe_key: crypto.randomUUID() })).rejects.toThrow(/fechado/);
    await expect(reversePayment(p.id, { actorId, reason: "Corrigir", dedupeKey: crypto.randomUUID() })).rejects.toThrow(/fechado/);
    await reopenCash(c.id, "Corrigir lançamento", actorId); await reopenCash(c.id, "Corrigir lançamento", actorId);
    expect(await prisma.auditLog.count({ where: { entity_id: c.id, action: "caixa_reaberto" } })).toBe(1);
    await reversePayment(p.id, { actorId, reason: "Corrigir", dedupeKey: crypto.randomUUID() });
    expect((await closeCash(a.id, "100", actorId)).theoretical_balance.toFixed(2)).toBe("100.00");
  });
  it.each(["NaN", "1e3", "1.999", "Infinity"])("rejeita saldo inválido %s", async (value) => { const a = await account(); await expect(closeCash(a.id, value, actorId)).rejects.toThrow(/inválido/); });
});
