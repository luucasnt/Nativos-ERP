import { beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/auth/get-current-user", () => ({ getCurrentUser: async () => ({ account_type: "internal", status: "ativo" }) }));
import { GET } from "@/app/api/admin/search/route";
import { prisma } from "@/lib/prisma";
import { assertResourceRelinkAllowed, assertServiceResources } from "@/lib/services/resource-validation";

let a: string, b: string, partner: string;
let da: string, db: string, ownDriver: string, pendingDriver: string;
let va: string, vb: string, ownVehicle: string, maintenanceVehicle: string;
beforeAll(async () => {
  a = (await prisma.company.create({ data: { name: "Fornecedor A", roles: ["fornecedor"] } })).id;
  b = (await prisma.company.create({ data: { name: "Fornecedor B", roles: ["fornecedor"] } })).id;
  partner = (await prisma.company.create({ data: { name: "Somente parceiro", roles: ["parceiro"] } })).id;
  const driver = async (supplier: string | null, approval: "aprovado" | "pendente" = "aprovado") => (await prisma.driver.create({ data: { name: `AAA Driver ${crypto.randomUUID()}`, owner_type: supplier ? "terceirizado" : "proprio", supplier_id: supplier, payment_type: supplier ? null : "diaria", approval_status: approval } })).id;
  const vehicle = async (supplier: string | null, status: "ativo" | "manutencao" = "ativo") => (await prisma.vehicle.create({ data: { plate: crypto.randomUUID(), model: `AAA Car ${crypto.randomUUID()}`, capacity: 4, owner_type: supplier ? "terceirizado" : "proprio", supplier_id: supplier, approval_status: "aprovado", status } })).id;
  da = await driver(a); db = await driver(b); ownDriver = await driver(null); pendingDriver = await driver(a, "pendente");
  va = await vehicle(a); vb = await vehicle(b); ownVehicle = await vehicle(null); maintenanceVehicle = await vehicle(a, "manutencao");
});
const assignment = (supplier: string | null, driver: string | null, vehicle: string | null) => ({ execution_type: supplier ? "fornecedor" as const : "propria" as const, supplier_id: supplier, driver_id: driver, vehicle_id: vehicle });
async function results(entity: string, execution: string, supplier?: string) {
  const response = await GET(new Request(`https://erp.test/api/admin/search?entity=${entity}&q=&execution_type=${execution}${supplier ? `&supplier_id=${supplier}` : ""}`));
  return { response, data: await response.json() as { results: Array<{ value: string }> } };
}
describe("vínculo de recursos por fornecedor", () => {
  it("lista somente motoristas e veículos ativos e aprovados do fornecedor A", async () => {
    const drivers = (await results("driver", "fornecedor", a)).data.results.map((r) => r.value);
    const vehicles = (await results("vehicle", "fornecedor", a)).data.results.map((r) => r.value);
    expect(drivers).toEqual([da]); expect(vehicles).toEqual([va]);
  });
  it("trocar fornecedor altera os dois conjuntos", async () => {
    expect((await results("driver", "fornecedor", b)).data.results.map((r) => r.value)).toEqual([db]);
    expect((await results("vehicle", "fornecedor", b)).data.results.map((r) => r.value)).toEqual([vb]);
  });
  it("frota própria exclui os terceirizados e não exige fornecedor", async () => {
    const drivers = (await results("driver", "propria")).data.results.map((r) => r.value);
    const vehicles = (await results("vehicle", "propria")).data.results.map((r) => r.value);
    expect(drivers).toContain(ownDriver); expect(drivers).not.toContain(da);
    expect(vehicles).toContain(ownVehicle); expect(vehicles).not.toContain(va);
  });
  it("aguarda seleção do fornecedor e recusa filtros inválidos", async () => {
    expect((await results("driver", "fornecedor")).data.results).toEqual([]);
    expect((await results("vehicle", "fornecedor")).data.results).toEqual([]);
    expect((await results("driver", "fornecedor", "invalid")).response.status).toBe(400);
  });
  it("seletor de fornecedores não lista empresa que é somente parceira", async () => {
    const response = await GET(new Request("https://erp.test/api/admin/search?entity=supplier&q=Somente%20parceiro"));
    const data = await response.json(); expect(data.results.some((r: { value: string }) => r.value === partner)).toBe(false);
  });
  it("servidor aceita vínculos corretos e bloqueia IDs de outros fornecedores ou da frota própria", async () => {
    await expect(assertServiceResources(assignment(a, da, va))).resolves.toBeUndefined();
    await expect(assertServiceResources(assignment(null, ownDriver, ownVehicle))).resolves.toBeUndefined();
    for (const value of [assignment(a, db, va), assignment(a, da, vb), assignment(a, ownDriver, va), assignment(null, da, ownVehicle), assignment(null, ownDriver, va)]) {
      await expect(assertServiceResources(value)).rejects.toThrow(/deve pertencer/);
    }
  });
  it("não atribui cadastros pendentes ou veículos em manutenção", async () => {
    await expect(assertServiceResources(assignment(a, pendingDriver, va))).rejects.toThrow(/ativo e aprovado/);
    await expect(assertServiceResources(assignment(a, da, maintenanceVehicle))).rejects.toThrow(/ativo e aprovado/);
    await expect(assertServiceResources(assignment(partner, null, null))).rejects.toThrow(/fornecedor/);
  });
  it("preserva recurso já atribuído ao editar dados sem nova atribuição", async () => {
    const old = assignment(a, pendingDriver, maintenanceVehicle);
    await expect(assertServiceResources(old, old)).resolves.toBeUndefined();
  });
  it("não deixa o cadastro migrar para outro fornecedor enquanto há serviço agendado", async () => {
    const client = await prisma.client.create({ data: { name: "Cliente do vínculo" } });
    const reservation = await prisma.reservation.create({ data: { code: crypto.randomUUID(), client_id: client.id } });
    const service = await prisma.service.create({ data: { reservation_id: reservation.id, type: "transfer_chegada", ...assignment(a, da, va), original_price: 100, price: 100 } });
    await expect(assertResourceRelinkAllowed("driver", da, { owner_type: "terceirizado", supplier_id: b })).rejects.toThrow(/Reatribua/);
    await expect(assertResourceRelinkAllowed("vehicle", va, { owner_type: "proprio", supplier_id: null })).rejects.toThrow(/Reatribua/);
    await prisma.service.update({ where: { id: service.id }, data: { execution_status: "concluido" } });
    await expect(assertResourceRelinkAllowed("driver", da, { owner_type: "terceirizado", supplier_id: b })).resolves.toBeUndefined();
    expect((await prisma.service.findUniqueOrThrow({ where: { id: service.id } })).supplier_id).toBe(a);
  });
});
