import { afterAll, afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/get-current-user", () => ({ assertActiveUser: vi.fn() }));
import { PrismaClient } from "@prisma/client";
import { assertActiveUser } from "@/lib/auth/get-current-user";
import { completeService } from "@/lib/services/service-execution";
import * as settlement from "@/lib/finance/settlement";
const db = new PrismaClient();
const checklist = { passenger_embarked: true, service_delivered: true, payment_checked: true };
afterAll(() => db.$disconnect());
afterEach(() => vi.restoreAllMocks());
async function setup(status: "em_andamento" | "concluido" | "agendado" = "em_andamento") {
  const company = await db.company.create({ data: { name: "Fornecedor encerramento", roles: ["fornecedor"] } });
  const user = await db.user.create({ data: { auth_user_id: crypto.randomUUID(), email: `${crypto.randomUUID()}@teste.local`, account_type: "portal", linked_company_id: company.id } });
  vi.mocked(assertActiveUser).mockResolvedValue({ ...user, linked_company: company, linked_driver: null });
  const client = await db.client.create({ data: { name: "Cliente encerramento" } });
  const reservation = await db.reservation.create({ data: { code: `END-${crypto.randomUUID()}`, client_id: client.id, collection_mode: "direto", status: "em_andamento" } });
  const service = await db.service.create({ data: { reservation_id: reservation.id, type: "transfer_saida", price: 1000, original_price: 1000, supplier_cost: 300, execution_type: "fornecedor", supplier_id: company.id, collection_actor: "fornecedor", execution_status: status, acceptance_status: "aceito", ...(status === "concluido" ? { completion_checklist: checklist, completed_at: new Date("2026-10-14T21:36:36Z") } : {}) } });
  await settlement.generateServiceFinanceEntries(service.id);
  return { service, reservation, user, company };
}
it("não compensa títulos cancelados antigos; conclusão, reserva, checklist e auditoria ficam consistentes", async () => {
  const { service, reservation, company } = await setup();
  const cancelled = await db.financeEntry.create({ data: { type: "despesa", category: "pagamento_fornecedor", amount: 300, party_type: "fornecedor", party_id: company.id, service_id: service.id, reservation_id: reservation.id, origin_type: "service_settlement", auto_key: `svc:${service.id}:pagamento_fornecedor`, status: "cancelado" } });
  expect(await completeService(service.id, checklist)).toEqual({ error: null });
  expect((await db.service.findUniqueOrThrow({ where: { id: service.id } })).execution_status).toBe("concluido");
  expect((await db.reservation.findUniqueOrThrow({ where: { id: reservation.id } })).status).toBe("concluido");
  expect((await db.financeEntry.findUniqueOrThrow({ where: { id: cancelled.id } })).status).toBe("cancelado");
  expect(await db.compensation.count({ where: { idempotency_key: `svc:${service.id}:compensacao_gross_repass` } })).toBe(0);
  expect(await db.auditLog.count({ where: { entity_id: service.id, action: "servico_finalizado" } })).toBe(1);
});
it("falha financeira desfaz status, horário, checklist, elegibilidade e auditoria; repetir funciona", async () => {
  const { service, reservation } = await setup();
  vi.spyOn(settlement, "markServiceFinanceEntriesEligible").mockImplementationOnce(async (id, tx) => {
    await tx!.financeEntry.updateMany({ where: { service_id: id }, data: { status: "pendente", payment_eligible: true } });
    throw new Error("Falha simulada financeira");
  });
  expect((await completeService(service.id, checklist)).error).toContain("Falha simulada");
  const unchanged = await db.service.findUniqueOrThrow({ where: { id: service.id } });
  expect(unchanged.execution_status).toBe("em_andamento"); expect(unchanged.completed_at).toBeNull(); expect(unchanged.completion_checklist).toBeNull();
  expect(await db.auditLog.count({ where: { entity_id: service.id } })).toBe(0);
  expect((await db.financeEntry.findFirstOrThrow({ where: { service_id: service.id } })).payment_eligible).toBe(false);
  expect((await db.reservation.findUniqueOrThrow({ where: { id: reservation.id } })).status).toBe("em_andamento");
  expect(await completeService(service.id, checklist)).toEqual({ error: null });
});
it("recupera encerramento legado e repetições sem alterar horário nem duplicar títulos ou auditoria", async () => {
  const { service, reservation } = await setup("concluido");
  const count = await db.financeEntry.count({ where: { service_id: service.id } });
  expect(await completeService(service.id, { ...checklist, notes: "Não deve substituir histórico" })).toEqual({ error: null });
  expect(await completeService(service.id, checklist)).toEqual({ error: null });
  const updated = await db.service.findUniqueOrThrow({ where: { id: service.id } });
  expect(updated.completed_at).toEqual(service.completed_at); expect(updated.completion_checklist).toEqual(checklist);
  expect((await db.reservation.findUniqueOrThrow({ where: { id: reservation.id } })).status).toBe("concluido");
  expect(await db.financeEntry.count({ where: { service_id: service.id } })).toBe(count);
  expect(await db.auditLog.count({ where: { entity_id: service.id, action: "servico_finalizado" } })).toBe(1);
});
it("não encerra sem checklist completo, sem início ou fora do fornecedor autorizado", async () => {
  const { service, user } = await setup();
  expect((await completeService(service.id, { passenger_embarked: true })).error).toContain("checklist");
  await db.service.update({ where: { id: service.id }, data: { execution_status: "agendado" } });
  expect((await completeService(service.id, checklist)).error).toContain("Inicie");
  vi.mocked(assertActiveUser).mockResolvedValue({ ...user, linked_company_id: null, linked_company: null, linked_driver: null });
  expect((await completeService(service.id, checklist)).error).toContain("permissão");
});
