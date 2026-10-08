"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CatalogItemType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireInternalUser } from "@/lib/auth/get-current-user";
import { logAudit } from "@/lib/audit";
import { deleteUnusedRecord, deletionError } from "@/lib/admin/delete-record";

const PATH = "/admin/configuracoes/catalogo";

const itemSchema = z.object({
  type: z.enum(CatalogItemType),
  key: z
    .string()
    .min(1, "Informe a chave.")
    .regex(/^[a-z0-9_]+$/, "Use apenas letras minúsculas, números e underscore."),
  label: z.string().min(1, "Informe o rótulo."),
  order: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 0))
    .refine((v) => Number.isInteger(v) && v >= 0, "Informe uma ordem inteira maior ou igual a zero."),
});

export type CatalogItemFormState = { error: string | null };

export async function createCatalogItem(
  _prevState: CatalogItemFormState,
  formData: FormData,
): Promise<CatalogItemFormState> {
  const user = await requireInternalUser();

  const parsed = itemSchema.safeParse({
    type: formData.get("type"),
    key: formData.get("key"),
    label: formData.get("label"),
    order: formData.get("order") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    const item = await prisma.catalogItem.create({
      data: {
        type: parsed.data.type,
        key: parsed.data.key,
        label: parsed.data.label,
        order: parsed.data.order,
      },
    });

    await logAudit({
      actorId: user.id,
      action: "catalogo_item_criado",
      entityType: "other",
      entityId: item.id,
      metadata: { type: item.type, key: item.key },
    });
  } catch {
    return { error: "Já existe um item com essa chave para este tipo." };
  }

  revalidatePath(PATH);
  return { error: null };
}

export async function updateCatalogItem(
  id: string,
  _prevState: CatalogItemFormState,
  formData: FormData,
): Promise<CatalogItemFormState> {
  const user = await requireInternalUser();
  const parsed = itemSchema.safeParse({
    type: formData.get("type"),
    key: formData.get("key"),
    label: formData.get("label"),
    order: formData.get("order") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const existing = await prisma.catalogItem.findUniqueOrThrow({ where: { id } });
  if (existing.key !== parsed.data.key) return { error: "A chave identifica regras do sistema e não pode ser alterada. Edite o rótulo ou crie um novo item." };

  try {
    const item = await prisma.catalogItem.update({
      where: { id },
      data: { key: parsed.data.key, label: parsed.data.label, order: parsed.data.order },
    });
    await logAudit({ actorId: user.id, action: "catalogo_item_atualizado", entityType: "other", entityId: item.id, metadata: { key: item.key } });
  } catch {
    return { error: "Já existe um item com essa chave para este tipo." };
  }
  revalidatePath(PATH);
  return { error: null };
}

export async function toggleCatalogItemActive(id: string, active: boolean) {
  const user = await requireInternalUser();

  await prisma.catalogItem.update({ where: { id }, data: { active } });

  await logAudit({
    actorId: user.id,
    action: active ? "catalogo_item_ativado" : "catalogo_item_desativado",
    entityType: "other",
    entityId: id,
  });

  revalidatePath(PATH);
}

export async function deleteCatalogItem(id: string): Promise<{ error: string | null }> {
  const user = await requireInternalUser();
  try { await deleteUnusedRecord("catalog", id, user.id); }
  catch (error) { return { error: deletionError(error) }; }
  revalidatePath(PATH);
  return { error: null };
}
