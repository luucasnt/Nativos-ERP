"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInternalUser } from "@/lib/auth/get-current-user";
import { createInternalUser, resetTemporaryPassword } from "@/lib/auth/provision-user";
import { logAudit } from "@/lib/audit";

const PATH = "/admin/configuracoes/usuarios";

const schema = z.object({
  email: z.string().email("E-mail inválido."),
  native_name: z.string().optional(),
  internal_role: z.enum(["financeiro", "operacional"]),
  is_owner: z.enum(["on"]).optional(),
});

export type InternalUserFormState = {
  error: string | null;
  temporaryPassword: string | null;
  email: string | null;
};

const emptyState: InternalUserFormState = { error: null, temporaryPassword: null, email: null };

export async function createInternalUserAction(
  _prevState: InternalUserFormState,
  formData: FormData,
): Promise<InternalUserFormState> {
  const actor = await requireInternalUser();

  const parsed = schema.safeParse({
    email: formData.get("email"),
    native_name: formData.get("native_name") || undefined,
    internal_role: formData.get("internal_role"),
    is_owner: formData.get("is_owner") || undefined,
  });

  if (!parsed.success) {
    return { ...emptyState, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  // Só um proprietário pode conceder o papel de proprietário a outro usuário.
  const wantsOwner = parsed.data.is_owner === "on";
  if (wantsOwner && !actor.is_owner) {
    return { ...emptyState, error: "Apenas um proprietário pode conceder esse papel." };
  }

  try {
    const result = await createInternalUser({
      email: parsed.data.email,
      nativeName: parsed.data.native_name,
      internalRole: parsed.data.internal_role,
      isOwner: wantsOwner,
    });

    await logAudit({
      actorId: actor.id,
      action: "usuario_interno_criado",
      entityType: "user",
      entityId: result.user.id,
    });

    revalidatePath(PATH);

    return { error: null, temporaryPassword: result.temporaryPassword, email: result.user.email };
  } catch (error) {
    return {
      ...emptyState,
      error: error instanceof Error ? error.message : "Falha ao criar usuário.",
    };
  }
}

export async function setInternalUserStatus(id: string, status: "ativo" | "inativo") {
  const actor = await requireInternalUser();

  await prisma.user.update({ where: { id }, data: { status } });

  await logAudit({
    actorId: actor.id,
    action: status === "ativo" ? "usuario_interno_ativado" : "usuario_interno_desativado",
    entityType: "user",
    entityId: id,
  });

  revalidatePath(PATH);
}

export async function resetInternalUserPasswordAction(
  userId: string,
  _prevState: InternalUserFormState,
): Promise<InternalUserFormState> {
  const actor = await requireInternalUser();

  try {
    const { temporaryPassword } = await resetTemporaryPassword(userId);

    await logAudit({
      actorId: actor.id,
      action: "senha_temporaria_gerada",
      entityType: "user",
      entityId: userId,
    });

    revalidatePath(PATH);

    return { error: null, temporaryPassword, email: null };
  } catch (error) {
    return {
      ...emptyState,
      error: error instanceof Error ? error.message : "Falha ao gerar nova senha.",
    };
  }
}
