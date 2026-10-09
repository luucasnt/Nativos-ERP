import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { resolveContractedCategory, resolveServiceCategories } from "@/lib/reservations/categories";
let base: string, upgrade: string, inactive: string, wrongType: string;
beforeAll(async () => {
  base = (await prisma.catalogItem.create({ data: { type: "tipo_veiculo", key: crypto.randomUUID(), label: "Convencional" } })).id;
  upgrade = (await prisma.catalogItem.create({ data: { type: "tipo_veiculo", key: crypto.randomUUID(), label: "Executiva" } })).id;
  inactive = (await prisma.catalogItem.create({ data: { type: "tipo_veiculo", key: crypto.randomUUID(), label: "Antiga", active: false } })).id;
  wrongType = (await prisma.catalogItem.create({ data: { type: "motivo_perda", key: crypto.randomUUID(), label: "Motivo" } })).id;
});
describe("categoria contratada e cortesia", () => {
  it("preserva o nome contratado mesmo se o catálogo mudar", async () => {
    const snapshot = await resolveContractedCategory(base);
    await prisma.catalogItem.update({ where: { id: base }, data: { label: "Novo nome" } });
    expect((await resolveContractedCategory(base, snapshot)).contracted_category_label).toBe("Convencional");
  });
  it("valida tipo e atividade, preservando categoria histórica inativa", async () => {
    await expect(resolveContractedCategory(wrongType)).rejects.toThrow("categoria");
    await expect(resolveContractedCategory(inactive)).rejects.toThrow("ativa");
    expect((await resolveContractedCategory(inactive, { contracted_category_id: inactive, contracted_category_label: "Antiga" })).contracted_category_label).toBe("Antiga");
  });
  it("exige categoria contratada e upgrade diferente", async () => {
    await expect(resolveServiceCategories(null, upgrade, undefined, null)).rejects.toThrow("contratada");
    await expect(resolveServiceCategories(base, base, undefined, null)).rejects.toThrow("diferente");
    const data = await resolveServiceCategories(base, upgrade, undefined, null);
    expect(data.upgrade_category_label).toBe("Executiva");
  });
  it("bloqueia veículo de outra categoria ao marcar upgrade", async () => {
    const vehicle = await prisma.vehicle.create({ data: { model: "Carro", plate: crypto.randomUUID(), capacity: 4, owner_type: "proprio", category_id: base } });
    await expect(resolveServiceCategories(base, upgrade, undefined, vehicle.id)).rejects.toThrow("veículo selecionado");
    await prisma.vehicle.update({ where: { id: vehicle.id }, data: { category_id: upgrade } });
    expect((await resolveServiceCategories(base, upgrade, undefined, vehicle.id)).upgrade_category_id).toBe(upgrade);
  });
});
