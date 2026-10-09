import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

type CategorySnapshot = { contracted_category_id: string | null; contracted_category_label: string | null };
type Reader = Pick<Prisma.TransactionClient, "catalogItem" | "vehicle">;

export async function resolveContractedCategory(id: string | null, previous?: CategorySnapshot, db: Reader = prisma): Promise<CategorySnapshot> {
  if (!id) return { contracted_category_id: null, contracted_category_label: null };
  const category = await db.catalogItem.findUnique({ where: { id } });
  if (!category || category.type !== "tipo_veiculo" || (!category.active && previous?.contracted_category_id !== id)) {
    throw new Error("Selecione uma categoria de veículo ativa.");
  }
  return { contracted_category_id: id, contracted_category_label: previous?.contracted_category_id === id ? previous.contracted_category_label || category.label : category.label };
}

export async function resolveServiceCategories(id: string | null, upgradeId: string | null, previous: (CategorySnapshot & { upgrade_category_id: string | null; upgrade_category_label: string | null }) | undefined, vehicleId: string | null, db: Reader = prisma) {
  const contracted = await resolveContractedCategory(id, previous, db);
  if (!upgradeId) return { ...contracted, upgrade_category_id: null, upgrade_category_label: null };
  if (!id) throw new Error("Informe a categoria contratada antes de oferecer um upgrade.");
  if (upgradeId === id) throw new Error("A categoria do upgrade deve ser diferente da categoria contratada.");
  const upgrade = await db.catalogItem.findUnique({ where: { id: upgradeId } });
  if (!upgrade || upgrade.type !== "tipo_veiculo" || (!upgrade.active && previous?.upgrade_category_id !== upgradeId)) throw new Error("Selecione uma categoria de upgrade ativa.");
  // A ordem do catálogo é de apresentação, não uma hierarquia de luxo/capacidade.
  // O operador escolhe a categoria superior adequada ao serviço e aos passageiros.
  if (vehicleId) {
    const vehicle = await db.vehicle.findUnique({ where: { id: vehicleId }, select: { category_id: true } });
    if (vehicle?.category_id && vehicle.category_id !== upgradeId) throw new Error("O veículo selecionado não pertence à categoria oferecida como upgrade.");
  }
  return { ...contracted, upgrade_category_id: upgradeId, upgrade_category_label: previous?.upgrade_category_id === upgradeId ? previous.upgrade_category_label || upgrade.label : upgrade.label };
}

export function categoryDescription(service: { contracted_category_label?: string | null; upgrade_category_label?: string | null }, fallback?: string | null) {
  return {
    contracted: service.contracted_category_label || fallback || "A confirmar",
    upgrade: service.upgrade_category_label ? `Upgrade de cortesia: ${service.upgrade_category_label}. Você receberá esta categoria sem custo adicional.` : null,
  };
}
