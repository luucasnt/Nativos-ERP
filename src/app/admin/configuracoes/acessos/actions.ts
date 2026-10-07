"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOwnerUser } from "@/lib/auth/get-current-user";
import { resetTemporaryPassword, syncAppMetadata } from "@/lib/auth/provision-user";
import { logAudit } from "@/lib/audit";

const PATH = "/admin/configuracoes/acessos";
export type AccessActionState = { error: string | null; temporaryPassword: string | null };

export async function setPortalAccessStatus(id: string, status: "ativo" | "inativo") {
  const actor = await requireOwnerUser();
  const target = await prisma.user.findUniqueOrThrow({ where: { id } });
  if (target.account_type !== "portal") throw new Error("Este acesso não é de portal.");
  await prisma.user.update({ where: { id }, data: { status } });
  await syncAppMetadata(id);
  await logAudit({ actorId: actor.id, action: status === "ativo" ? "acesso_portal_ativado" : "acesso_portal_desativado", entityType: "user", entityId: id });
  revalidatePath(PATH);
}

export async function resetPortalAccessPassword(id: string, _prev: AccessActionState): Promise<AccessActionState> {
  const actor = await requireOwnerUser();
  try {
    const target = await prisma.user.findUniqueOrThrow({ where: { id } });
    if (target.account_type !== "portal") return { error: "Este acesso não é de portal.", temporaryPassword: null };
    const { temporaryPassword } = await resetTemporaryPassword(z.string().uuid().parse(id));
    await logAudit({ actorId: actor.id, action: "senha_portal_redefinida", entityType: "user", entityId: id });
    revalidatePath(PATH);
    return { error: null, temporaryPassword };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Não foi possível redefinir a senha.", temporaryPassword: null };
  }
}
