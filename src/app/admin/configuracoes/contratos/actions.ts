"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInternalUser } from "@/lib/auth/get-current-user";
import { logAudit } from "@/lib/audit";

const PATH = "/admin/configuracoes/contratos";

const clauseSchema = z.object({
  category: z.string().min(1, "Informe a categoria."),
  order: z.string().optional().transform((v) => (v ? Number(v) : 0)),
  title: z.string().min(1, "Informe o título."),
  content: z.string().min(1, "Informe o conteúdo."),
  active: z.enum(["on"]).optional(),
});

export type ClauseFormState = { error: string | null };

function parse(formData: FormData) {
  return clauseSchema.safeParse({
    category: formData.get("category"),
    order: formData.get("order") || undefined,
    title: formData.get("title"),
    content: formData.get("content"),
    active: formData.get("active") || undefined,
  });
}

export async function createClause(
  _prevState: ClauseFormState,
  formData: FormData,
): Promise<ClauseFormState> {
  const user = await requireInternalUser();
  const parsed = parse(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const clause = await prisma.contractClause.create({
    data: {
      category: parsed.data.category,
      order: parsed.data.order,
      title: parsed.data.title,
      content: parsed.data.content,
      active: parsed.data.active === "on",
    },
  });

  await logAudit({
    actorId: user.id,
    action: "clausula_contrato_criada",
    entityType: "other",
    entityId: clause.id,
  });

  revalidatePath(PATH);
  redirect(PATH);
}

export async function updateClause(
  id: string,
  _prevState: ClauseFormState,
  formData: FormData,
): Promise<ClauseFormState> {
  const user = await requireInternalUser();
  const parsed = parse(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  await prisma.contractClause.update({
    where: { id },
    data: {
      category: parsed.data.category,
      order: parsed.data.order,
      title: parsed.data.title,
      content: parsed.data.content,
      active: parsed.data.active === "on",
    },
  });

  await logAudit({
    actorId: user.id,
    action: "clausula_contrato_atualizada",
    entityType: "other",
    entityId: id,
  });

  revalidatePath(PATH);
  redirect(PATH);
}

export async function deleteClause(id: string) {
  const user = await requireInternalUser();

  await prisma.contractClause.delete({ where: { id } });

  await logAudit({
    actorId: user.id,
    action: "clausula_contrato_excluida",
    entityType: "other",
    entityId: id,
  });

  revalidatePath(PATH);
}
