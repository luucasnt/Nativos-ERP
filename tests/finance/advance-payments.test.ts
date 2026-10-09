import { beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const auth = vi.hoisted(() => ({ id: "" }));
vi.mock("@/lib/auth/get-current-user", () => ({ requireFinancialUser: async () => ({ id: auth.id }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { rejectService } from "@/lib/reservations/acceptance";
import { prisma } from "@/lib/prisma";
import { registerPayment } from "@/app/admin/financeiro/actions";
import { createPayment, reversePayment } from "@/lib/finance/ledger";
import { generateServiceSaleEntry, generateServiceFinanceEntries, markServiceFinanceEntriesEligible } from "@/lib/finance/settlement";
import { canRegisterEntryPayment } from "@/lib/finance/payment-availability";
import { loadVoucherData } from "@/lib/documents/voucher";
import { voucherFinancialSummary } from "@/lib/documents/voucher-finance";

beforeAll(async () => { auth.id = (await prisma.user.create({ data: { auth_user_id: crypto.randomUUID(), email: `${crypto.randomUUID()}@advance.test`, account_type: "internal", role: "admin" } })).id; });
async function sale(partner = false, awaiting = false) {
  const client = await prisma.client.create({ data: { name: "Cliente antecipação" } });
  const company = await prisma.company.create({ data: { name: "Parceiro antecipação", roles: ["parceiro", "fornecedor"] } });
  const reservation = await prisma.reservation.create({ data: { code: crypto.randomUUID(), client_id: client.id, collection_mode: partner ? "faturado" : "nativos", origin_partner_id: partner ? company.id : null, voucher_show_price: true } });
  const service = await prisma.service.create({ data: { reservation_id: reservation.id, type: "transfer_chegada", execution_type: "fornecedor", supplier_id: company.id, supplier_cost: "200", original_price: "480", price: "480", acceptance_status: awaiting ? "aguardando_aceite" : "aceito" } });
  await generateServiceSaleEntry(service.id);
  const entry = await prisma.financeEntry.findUniqueOrThrow({ where: { auto_key: `svc:${service.id}:venda_servico` } });
  return { reservation, service, entry };
}
const payment = (id: string, amount: string, dedupeKey = crypto.randomUUID()) => createPayment({ finance_entry_id: id, type: "recebimento", amount, payment_method: "pix", dedupe_key: dedupeKey });

describe("recebimentos antecipados de reservas", () => {
  it("registra sinal parcial e saldo integral pela ação real antes da execução, com recibo e voucher", async () => {
    const { reservation, service, entry } = await sale();
    expect(canRegisterEntryPayment(entry)).toBe(true);
    const key = crypto.randomUUID();
    const input = { entryId: entry.id, amount: "240,00", paymentMethod: "pix", receiptUrl: "https://example.test/comprovante", dedupeKey: key };
    await registerPayment(input); await registerPayment(input);
    expect(await prisma.payment.count({ where: { finance_entry_id: entry.id } })).toBe(1);
    let title = await prisma.financeEntry.findUniqueOrThrow({ where: { id: entry.id } });
    expect(title.status).toBe("pendente");
    const summary = voucherFinancialSummary((await loadVoucherData(reservation.id)).reservation);
    expect(summary.paid.toFixed(2)).toBe("240.00"); expect(summary.remaining.toFixed(2)).toBe("240.00");
    await registerPayment({ ...input, amount: "240", dedupeKey: crypto.randomUUID() });
    title = await prisma.financeEntry.findUniqueOrThrow({ where: { id: entry.id } });
    expect(title.status).toBe("pago"); expect(canRegisterEntryPayment(title)).toBe(false);
    expect((await prisma.service.findUniqueOrThrow({ where: { id: service.id } })).execution_status).toBe("agendado");
    await markServiceFinanceEntriesEligible(service.id);
    expect((await prisma.financeEntry.findUniqueOrThrow({ where: { id: entry.id } })).status).toBe("pago");
  });
  it("permite pagamento integral de parceiro com comprovante sem aguardar conclusão", async () => {
    const { entry } = await sale(true);
    expect(entry.party_type).toBe("parceiro");
    await expect(registerPayment({ entryId: entry.id, amount: "480", paymentMethod: "pix", dedupeKey: crypto.randomUUID() })).rejects.toThrow(/comprovante/);
    await registerPayment({ entryId: entry.id, amount: "480", paymentMethod: "transferencia", receiptUrl: "https://example.test/comprovante", dedupeKey: crypto.randomUUID() });
    expect((await prisma.financeEntry.findUniqueOrThrow({ where: { id: entry.id } })).status).toBe("pago");
  });
  it("venda aguardando fornecedor admite sinal sem criar ou liberar despesas", async () => {
    const { service, entry } = await sale(false, true);
    expect(await prisma.financeEntry.count({ where: { service_id: service.id } })).toBe(1);
    await payment(entry.id, "100");
    await prisma.service.update({ where: { id: service.id }, data: { acceptance_status: "aceito" } });
    await generateServiceFinanceEntries(service.id);
    const cost = await prisma.financeEntry.findUniqueOrThrow({ where: { auto_key: `svc:${service.id}:pagamento_fornecedor` } });
    expect(canRegisterEntryPayment(cost)).toBe(false);
    await expect(createPayment({ finance_entry_id: cost.id, type: "pagamento", amount: "200", payment_method: "pix", dedupe_key: crypto.randomUUID() })).rejects.toThrow(/elegível/);
    expect(await prisma.financeEntry.count({ where: { service_id: service.id, category: "venda_servico" } })).toBe(1);
  });
  it("bloqueia valores maiores que saldo e parcelas concorrentes que excedam o total", async () => {
    const { entry } = await sale();
    await expect(payment(entry.id, "481")).rejects.toThrow(/saldo/);
    const results = await Promise.allSettled([payment(entry.id, "300"), payment(entry.id, "300")]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect((await prisma.payment.aggregate({ where: { finance_entry_id: entry.id }, _sum: { amount: true } }))._sum.amount?.toFixed(2)).toBe("300.00");
  });
  it("estorno reabre saldo, preserva histórico e permite novo recebimento", async () => {
    const { entry, reservation } = await sale();
    const original = await payment(entry.id, "480");
    await reversePayment(original.id, { actorId: auth.id, reason: "Comprovante incorreto", dedupeKey: crypto.randomUUID() });
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: original.id } })).reversed_at).not.toBeNull();
    expect(voucherFinancialSummary((await loadVoucherData(reservation.id)).reservation).paid.toFixed(2)).toBe("0.00");
    await payment(entry.id, "200");
  });
  it("recusa após antecipação integral exige ajuste e não apaga o saldo do passageiro", async () => {
    const { service, entry } = await sale(false, true);
    await payment(entry.id, "480");
    await expect(rejectService(service.id, "Sem disponibilidade")).rejects.toThrow(/ajuste\/estorno/);
    expect((await prisma.service.findUniqueOrThrow({ where: { id: service.id } })).acceptance_status).toBe("aguardando_aceite");
    expect((await prisma.financeEntry.findUniqueOrThrow({ where: { id: entry.id } })).status).toBe("pago");
  });
  it("não recebe venda cancelada, recusada, cortesia ou atribuída a cobrança direta", async () => {
    for (const patch of [{ status: "cancelado" as const }, { is_cortesia: true }, { collection_mode: "direto" as const }]) {
      const { reservation, entry } = await sale();
      await prisma.reservation.update({ where: { id: reservation.id }, data: patch });
      await expect(payment(entry.id, "100")).rejects.toThrow(/disponível/);
    }
    const { service, entry } = await sale();
    await prisma.service.update({ where: { id: service.id }, data: { acceptance_status: "recusado" } });
    await expect(payment(entry.id, "100")).rejects.toThrow(/disponível/);
  });
});
