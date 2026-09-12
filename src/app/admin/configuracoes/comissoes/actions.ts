"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInternalUser } from "@/lib/auth/get-current-user";
import { logAudit } from "@/lib/audit";

const PATH = "/admin/configuracoes/comissoes";

const schema = z.object({
  target: z.enum(["company", "driver"]),
  category_key: z.string().min(1, "Informe a categoria."),
  commission_percent: z
    .string()
    .min(1, "Informe o percentual.")
    .refine((v) => !Number.isNaN(Number(v)), "Percentual inválido."),
  active: z.enum(["on"]).optional(),
});

export type CommissionDefaultFormState = { error: string | null };

function parse(formData: FormData) {
  return schema.safeParse({
    target: formData.get("target"),
    category_key: formData.get("category_key"),
    commission_percent: formData.get("commission_percent"),
    active: formData.get("active") || undefined,
  });
}

export async function createCommissionDefault(
  _prevState: CommissionDefaultFormState,
  formData: FormData,
): Promise<CommissionDefaultFormState> {
  const user = await requireInternalUser();
  const parsed = parse(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    const rule = await prisma.commissionDefault.create({
      data: {
        target: parsed.data.target,
        category_key: parsed.data.category_key,
        commission_percent: parsed.data.commission_percent,
        active: parsed.data.active === "on",
      },
    });

    await logAudit({
      actorId: user.id,
      action: "comissao_padrao_criada",
      entityType: "other",
      entityId: rule.id,
    });
  } catch {
    return { error: "Já existe uma regra para esse alvo e categoria." };
  }

  revalidatePath(PATH);
  redirect(PATH);
}

export async function updateCommissionDefault(
  id: string,
  _prevState: CommissionDefaultFormState,
  formData: FormData,
): Promise<CommissionDefaultFormState> {
  const user = await requireInternalUser();
  const parsed = parse(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  await prisma.commissionDefault.update({
    where: { id },
    data: {
      commission_percent: parsed.data.commission_percent,
      active: parsed.data.active === "on",
    },
  });

  await logAudit({
    actorId: user.id,
    action: "comissao_padrao_atualizada",
    entityType: "other",
    entityId: id,
  });

  revalidatePath(PATH);
  redirect(PATH);
}

export async function deleteCommissionDefault(id: string) {
  const user = await requireInternalUser();

  await prisma.commissionDefault.delete({ where: { id } });

  await logAudit({
    actorId: user.id,
    action: "comissao_padrao_excluida",
    entityType: "other",
    entityId: id,
  });

  revalidatePath(PATH);
}
