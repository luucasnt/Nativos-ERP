import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { deleteUnusedRecord } from "@/lib/admin/delete-record";
let actorId: string;
beforeAll(async () => { const u = await prisma.user.create({ data: { auth_user_id: crypto.randomUUID(), email: `${crypto.randomUUID()}@test.local`, account_type: "internal", role: "admin" } }); actorId = u.id; });
const client = () => prisma.client.create({ data: { name: "Cadastro de teste" } });
const company = () => prisma.company.create({ data: { name: "Empresa de teste", roles: ["parceiro", "fornecedor"] } });
const driver = () => prisma.driver.create({ data: { name: "Motorista de teste", owner_type: "proprio", payment_type: "diaria", daily_rate: 100 } });
const vehicle = () => prisma.vehicle.create({ data: { plate: crypto.randomUUID(), model: "Teste", capacity: 4, owner_type: "proprio" } });
async function reservation(clientId: string) { return prisma.reservation.create({ data: { code: crypto.randomUUID(), client_id: clientId } }); }
async function historicalEntry(partyType: "cliente" | "motorista" | "fornecedor", partyId: string) { return prisma.financeEntry.create({ data: { type: "despesa", category: "outro", amount: 100, party_type: partyType, party_id: partyId, origin_type: "manual" } }); }

describe("exclusão com preservação de vínculos", () => {
  it("exclui cliente sem vínculos e audita na mesma transação", async () => {
    const c = await client(); await deleteUnusedRecord("client", c.id, actorId);
    expect(await prisma.client.findUnique({ where: { id: c.id } })).toBeNull();
    expect(await prisma.auditLog.count({ where: { entity_id: c.id, action: "client_excluido" } })).toBe(1);
  });
  it("reverte a exclusão se a auditoria não puder ser gravada", async () => {
    const c = await client(); await expect(deleteUnusedRecord("client", c.id, crypto.randomUUID())).rejects.toThrow();
    expect(await prisma.client.findUnique({ where: { id: c.id } })).not.toBeNull();
  });
  it("bloqueia cliente com reserva", async () => {
    const c = await client(); await reservation(c.id); await expect(deleteUnusedRecord("client", c.id, actorId)).rejects.toThrow(/vínculos/);
  });
  it("bloqueia cliente indicador sem FK", async () => {
    const c = await client(); const passenger = await client(); await prisma.reservation.create({ data: { code: crypto.randomUUID(), client_id: passenger.id, referrer_type: "client", referrer_id: c.id } });
    await expect(deleteUnusedRecord("client", c.id, actorId)).rejects.toThrow(/vínculos/);
  });
  it.each(["client", "company", "driver"] as const)("bloqueia %s com contraparte financeira polimórfica", async (kind) => {
    const r = await (kind === "client" ? client() : kind === "company" ? company() : driver());
    await historicalEntry(kind === "client" ? "cliente" : kind === "company" ? "fornecedor" : "motorista", r.id);
    await expect(deleteUnusedRecord(kind, r.id, actorId)).rejects.toThrow(/vínculos/);
  });
  it("exclui empresa sem vínculos sem usar relação inexistente", async () => { const c = await company(); await deleteUnusedRecord("company", c.id, actorId); expect(await prisma.company.findUnique({ where: { id: c.id } })).toBeNull(); });
  it("bloqueia empresa com saldo", async () => { const c = await company(); await prisma.company.update({ where: { id: c.id }, data: { saldo_conta_corrente: 50 } }); await expect(deleteUnusedRecord("company", c.id, actorId)).rejects.toThrow(/vínculos/); });
  it("bloqueia motorista com login", async () => { const d = await driver(); await prisma.user.create({ data: { auth_user_id: crypto.randomUUID(), email: `${crypto.randomUUID()}@test.local`, account_type: "portal", linked_driver_id: d.id } }); await expect(deleteUnusedRecord("driver", d.id, actorId)).rejects.toThrow(/vínculos/); });
  it("exclui motorista sem vínculos", async () => { const d = await driver(); await deleteUnusedRecord("driver", d.id, actorId); expect(await prisma.driver.findUnique({ where: { id: d.id } })).toBeNull(); });
  it("bloqueia veículo com serviço e preserva a FK", async () => { const v = await vehicle(); const r = await reservation((await client()).id); const s = await prisma.service.create({ data: { reservation_id: r.id, vehicle_id: v.id, type: "transfer_chegada", execution_type: "propria", original_price: 100, price: 100 } }); await expect(deleteUnusedRecord("vehicle", v.id, actorId)).rejects.toThrow(/vínculos/); expect((await prisma.service.findUniqueOrThrow({ where: { id: s.id } })).vehicle_id).toBe(v.id); });
  it("exclui veículo sem vínculos e sua configuração dependente", async () => { const v = await vehicle(); await prisma.vehicleExpensePolicy.create({ data: { vehicle_id: v.id, expected_km_per_liter: 10 } }); await deleteUnusedRecord("vehicle", v.id, actorId); expect(await prisma.vehicle.findUnique({ where: { id: v.id } })).toBeNull(); });
  it("bloqueia catálogo em uso em vez de remover a categoria do veículo", async () => { const category = await prisma.catalogItem.create({ data: { type: "tipo_veiculo", key: crypto.randomUUID(), label: "Teste" } }); const v = await vehicle(); await prisma.vehicle.update({ where: { id: v.id }, data: { category_id: category.id } }); await expect(deleteUnusedRecord("catalog", category.id, actorId)).rejects.toThrow(/vínculos/); });
  it("bloqueia conta com pagamento", async () => { const a = await prisma.bankAccount.create({ data: { name: "Teste", type: "caixa" } }); const e = await historicalEntry("cliente", (await client()).id); await prisma.payment.create({ data: { finance_entry_id: e.id, type: "recebimento", amount: 100, payment_method: "pix", bank_account_id: a.id } }); await expect(deleteUnusedRecord("bank", a.id, actorId)).rejects.toThrow(/vínculos/); });
  it("bloqueia reserva com título, mesmo cancelado", async () => { const r = await reservation((await client()).id); await prisma.financeEntry.create({ data: { reservation_id: r.id, type: "receita", category: "outro", status: "cancelado", amount: 100, party_type: "interno", origin_type: "manual" } }); await expect(deleteUnusedRecord("reservation", r.id, actorId)).rejects.toThrow(/vínculos/); });
  it("exclui reserva vazia", async () => { const r = await reservation((await client()).id); await deleteUnusedRecord("reservation", r.id, actorId); expect(await prisma.reservation.findUnique({ where: { id: r.id } })).toBeNull(); });
  it("não exclui serviço de outra reserva", async () => { const r = await reservation((await client()).id); const s = await prisma.service.create({ data: { reservation_id: r.id, type: "transfer_chegada", execution_type: "propria", original_price: 100, price: 100 } }); await expect(deleteUnusedRecord("service", s.id, actorId, crypto.randomUUID())).rejects.toThrow(/não pertence/); });
  it("não exclui serviço iniciado", async () => { const r = await reservation((await client()).id); const s = await prisma.service.create({ data: { reservation_id: r.id, type: "transfer_chegada", execution_type: "propria", original_price: 100, price: 100, execution_status: "em_andamento" } }); await expect(deleteUnusedRecord("service", s.id, actorId, r.id)).rejects.toThrow(/vínculos/); });
  it("exclui serviço agendado sem histórico", async () => { const r = await reservation((await client()).id); const s = await prisma.service.create({ data: { reservation_id: r.id, type: "transfer_chegada", execution_type: "propria", original_price: 100, price: 100 } }); await deleteUnusedRecord("service", s.id, actorId, r.id); expect(await prisma.service.findUnique({ where: { id: s.id } })).toBeNull(); });
  it("bloqueia registro com notificação histórica", async () => { const c = await client(); await prisma.portalNotification.create({ data: { user_id: actorId, type: "reserva_confirmada", message: "Teste", entity_ref_type: "client", entity_ref_id: c.id } }); await expect(deleteUnusedRecord("client", c.id, actorId)).rejects.toThrow(/notificações/); });
});
