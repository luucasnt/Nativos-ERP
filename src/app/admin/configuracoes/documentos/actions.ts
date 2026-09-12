"use server";

import { revalidatePath } from "next/cache";
import { requireInternalUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

const PATH = "/admin/configuracoes/documentos";

export type DocumentSettingsState = { error: string | null; saved: boolean };

export async function updateDocumentSettings(
  _prevState: DocumentSettingsState,
  formData: FormData,
): Promise<DocumentSettingsState> {
  const user = await requireInternalUser();

  const value = {
    voucher_default: formData.get("voucher_default") === "on",
    os_default: formData.get("os_default") === "on",
  };

  await prisma.setting.upsert({
    where: { key: "documentos_exibicao_valor" },
    update: { value },
    create: { key: "documentos_exibicao_valor", category: "documentos", value },
  });

  await logAudit({
    actorId: user.id,
    action: "configuracao_documentos_atualizada",
    entityType: "other",
    metadata: value,
  });

  revalidatePath(PATH);
  return { error: null, saved: true };
}
