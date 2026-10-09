import { beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const auth = vi.hoisted(() => ({ id: "" }));
vi.mock("@/lib/auth/get-current-user", () => ({ requireInternalUser: async () => ({ id: auth.id }) }));
vi.mock("next/navigation", () => ({ redirect: () => { throw new Error("REDIRECT"); }, unstable_rethrow: () => {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { prisma } from "@/lib/prisma";
import { createService, updateService, respondToServiceInternal } from "@/app/admin/reservas/[id]/servicos/actions";
import { updateDriver } from "@/app/admin/motoristas/actions";
import { updateVehicle } from "@/app/admin/veiculos/actions";
let a: string, b: string, da: string, db: string, va: string, reservationId: string;
beforeAll(async () => {
  auth.id = (await prisma.user.create({ data: { auth_user_id: crypto.randomUUID(), email: `${crypto.randomUUID()}@example.test`, account_type: "internal", role: "admin" } })).id;
  a = (await prisma.company.create({ data: { name: "Executor A", roles: ["fornecedor"] } })).id;
  b = (await prisma.company.create({ data: { name: "Executor B", roles: ["fornecedor"] } })).id;
  da = (await prisma.driver.create({ data: { name: "Driver A", owner_type: "terceirizado", supplier_id: a, approval_status: "aprovado" } })).id;
  db = (await prisma.driver.create({ data: { name: "Driver B", owner_type: "terceirizado", supplier_id: b, approval_status: "aprovado" } })).id;
  va = (await prisma.vehicle.create({ data: { model: "Car A", plate: crypto.randomUUID(), capacity: 4, owner_type: "terceirizado", supplier_id: a, approval_status: "aprovado" } })).id;
  const client = await prisma.client.create({ data: { name: "Client Assignment" } });
  reservationId = (await prisma.reservation.create({ data: { client_id: client.id, code: crypto.randomUUID() } })).id;
});
function form(supplier: string, driver: string, vehicle: string) {
  const f = new FormData();
  for (const [key, value] of Object.entries({ type: "transfer_chegada", execution_type: "fornecedor", supplier_id: supplier, driver_id: driver, vehicle_id: vehicle, supplier_cost: "50", original_price: "100", discount_type: "nenhum", os_show_price: "herda" })) f.set(key, value);
  return f;
}
describe("atribuição validada nas ações reais de cadastro e edição", () => {
  it("confirma serviço próprio sem exigir aceite da própria equipe, mantendo alocação pendente", async () => {
    const client = await prisma.client.create({ data: { name: "Operação própria" } });
    const reservation = await prisma.reservation.create({ data: { client_id: client.id, code: crypto.randomUUID() } });
    const f = form("", "", ""); f.set("execution_type", "propria"); f.set("supplier_cost", "");
    await expect(createService(reservation.id, { error: null }, f)).rejects.toThrow("REDIRECT");
    const own = await prisma.service.findFirstOrThrow({ where: { reservation_id: reservation.id, execution_type: "propria" } });
    expect(own.acceptance_status).toBe("aceito");
    expect(own.driver_id).toBeNull(); expect(own.vehicle_id).toBeNull();

  });
  it("devolve motivo legível sem aceitar serviço de outra reserva", async () => {
    const other = await prisma.service.findFirstOrThrow({ where: { reservation_id: { not: reservationId } } });
    const result = await respondToServiceInternal(reservationId, other.id, false, "");
    expect(result.error).toBe("O serviço informado não pertence a esta reserva.");
    expect(result.error).not.toContain("Prisma");
  });
  it("não grava serviço ou financeiro com motorista de outro fornecedor", async () => {
    const result = await createService(reservationId, { error: null }, form(a, db, va));
    expect(result.error).toContain("ao fornecedor selecionado");
    expect(await prisma.service.count({ where: { reservation_id: reservationId } })).toBe(0);
    expect(await prisma.financeEntry.count({ where: { reservation_id: reservationId } })).toBe(0);
  });
  it("grava vínculo correto, impede edição cruzada e protege os cadastros atribuídos", async () => {
    await expect(createService(reservationId, { error: null }, form(a, da, va))).rejects.toThrow("REDIRECT");
    const service = await prisma.service.findFirstOrThrow({ where: { reservation_id: reservationId } });
    const result = await updateService(reservationId, service.id, { error: null }, form(a, db, va));
    expect(result.error).toContain("ao fornecedor selecionado");
    expect((await prisma.service.findUniqueOrThrow({ where: { id: service.id } })).driver_id).toBe(da);
    const driverForm = new FormData(); driverForm.set("name", "Driver A"); driverForm.set("owner_type", "terceirizado"); driverForm.set("supplier_id", b);
    expect((await updateDriver(da, { error: null }, driverForm)).error).toContain("Reatribua");
    const vehicle = await prisma.vehicle.findUniqueOrThrow({ where: { id: va } });
    const vehicleForm = new FormData();
    for (const [key, value] of Object.entries({ plate: vehicle.plate, model: vehicle.model, capacity: "4", owner_type: "terceirizado", supplier_id: b, status: "ativo" })) vehicleForm.set(key, value);
    expect((await updateVehicle(va, { error: null }, vehicleForm)).error).toContain("Reatribua");
    expect((await prisma.driver.findUniqueOrThrow({ where: { id: da } })).supplier_id).toBe(a);
    expect((await prisma.vehicle.findUniqueOrThrow({ where: { id: va } })).supplier_id).toBe(a);
    await expect(updateService(reservationId, service.id, { error: null }, form(b, db, ""))).rejects.toThrow("REDIRECT");
    const changed = await prisma.service.findUniqueOrThrow({ where: { id: service.id } });
    expect(changed).toMatchObject({ supplier_id: b, driver_id: db, vehicle_id: null, acceptance_status: "aguardando_aceite" });
  });
});
