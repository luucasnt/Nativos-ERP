import { describe, expect, it } from "vitest";
import { parseDriverForm } from "@/lib/drivers/form";
import { prisma } from "@/lib/prisma";
import { computeServiceSettlementEntries, markServiceFinanceEntriesEligible } from "@/lib/finance/settlement";
import { recalculateReservationCommissions } from "@/lib/finance/commissions";
import { approveServiceExpense } from "@/lib/finance/expenses";
function form(owner: string) { const f = new FormData(); f.set("name", "Motorista"); f.set("owner_type", owner); if (owner === "terceirizado") f.set("supplier_id", crypto.randomUUID()); return f; }
describe("motorista terceirizado sem remuneração", () => {
  it("cadastra sem selecionar pagamento nem informar valores", () => { const parsed = parseDriverForm(form("terceirizado")); expect(parsed).toMatchObject({ ok: true, data: { payment_type: null, commission: null, daily_rate: null, salario_mensal: null } }); });
  it("descarta termos financeiros de um formulário antigo mesmo para dono-motorista", () => { const f = form("terceirizado"); f.set("payment_type", "mesclado"); f.set("commission", "20"); f.set("daily_rate", "350"); f.set("salario_mensal", "5000"); f.set("is_company_owner_driver", "on"); expect(parseDriverForm(f)).toMatchObject({ ok: true, data: { is_company_owner_driver: true, payment_type: null, commission: null, daily_rate: null, salario_mensal: null } }); });
  it("mantém o vínculo operacional com fornecedor obrigatório", () => { const f = form("terceirizado"); f.delete("supplier_id"); expect(parseDriverForm(f)).toMatchObject({ ok: false }); });
  it("motorista próprio continua exigindo forma de pagamento e valor", () => { const f = form("proprio"); expect(parseDriverForm(f).ok).toBe(false); f.set("payment_type", "diaria"); expect(parseDriverForm(f).ok).toBe(false); f.set("daily_rate", "350,00"); expect(parseDriverForm(f)).toMatchObject({ ok: true, data: { payment_type: "diaria", daily_rate: "350.00" } }); });
  it.each(["comissao", "diaria", "salario_mensal", "mesclado"])("não gera remuneração por serviço para terceirizado com configuração antiga %s", (type) => {
    const entries = computeServiceSettlementEntries({ price: 1000, supplier_cost: 500, execution_type: "propria", collection_mode: "direto", is_cortesia: false, origin_partner_id: null, client_id: crypto.randomUUID(), supplier_id: null, supplier_settlement_mode: null, driver_id: crypto.randomUUID(), driver_owner_type: "terceirizado", driver_payment_type: type as "comissao" | "diaria" | "salario_mensal" | "mesclado", driver_commission_percent: 20 });
    expect(entries.some((e) => e.party_type === "motorista")).toBe(false);
  });
  it("banco aceita cadastro sem remuneração e não gera diária/salário nem comissão de indicação", async () => {
    const company = await prisma.company.create({ data: { name: "Fornecedor teste", roles: ["fornecedor"] } });
    const f = form("terceirizado"); f.set("supplier_id", company.id); const parsed = parseDriverForm(f); if (!parsed.ok) throw new Error(parsed.error);
    const driver = await prisma.driver.create({ data: parsed.data });
    expect(driver.payment_type).toBeNull();
    const client = await prisma.client.create({ data: { name: "Cliente teste" } });
    const r = await prisma.reservation.create({ data: { client_id: client.id, code: `THIRD-${crypto.randomUUID()}`, referrer_type: "driver", referrer_id: driver.id, commission_percent: 10 } });
    const s = await prisma.service.create({ data: { reservation_id: r.id, type: "transfer_chegada", execution_type: "propria", driver_id: driver.id, original_price: 1000, price: 1000, execution_status: "concluido" } });
    await markServiceFinanceEntriesEligible(s.id); await recalculateReservationCommissions(r.id);
    const category = await prisma.catalogItem.findFirstOrThrow({ where: { type: "categoria_despesa" } });
    const expense = await prisma.serviceExpense.create({ data: { service_id: s.id, driver_id: driver.id, category_id: category.id, amount: 80 } });
    await expect(approveServiceExpense(expense.id, crypto.randomUUID())).rejects.toThrow("somente para motoristas próprios");
    expect((await prisma.serviceExpense.findUniqueOrThrow({ where: { id: expense.id } })).status).toBe("pendente");
    expect(await prisma.financeEntry.count({ where: { party_type: "motorista", party_id: driver.id } })).toBe(0);
  });
  it("mantém pagamentos ao fornecedor sem pagar ao motorista dele", () => {
    const entries = computeServiceSettlementEntries({ price: 1000, supplier_cost: 500, execution_type: "fornecedor", collection_mode: "nativos", is_cortesia: false, origin_partner_id: null, client_id: crypto.randomUUID(), supplier_id: crypto.randomUUID(), supplier_settlement_mode: null, driver_id: crypto.randomUUID(), driver_owner_type: "terceirizado", driver_payment_type: null, driver_commission_percent: null });
    expect(entries.some((e) => e.category === "pagamento_fornecedor")).toBe(true); expect(entries.some((e) => e.party_type === "motorista")).toBe(false);
  });
});
