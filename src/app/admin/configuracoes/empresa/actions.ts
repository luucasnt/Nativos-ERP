"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireInternalUser } from "@/lib/auth/get-current-user";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

const schema = z.object({ name: z.string().min(2), document: z.string().optional(), email: z.string().email().or(z.literal("")), phone: z.string().optional(), website: z.string().url().or(z.literal("")), address: z.string().optional(), city: z.string().optional(), state: z.string().max(2).optional(), footer: z.string().max(300).optional() });

export async function updateCompanySettings(_prev: { error: string | null; saved: boolean }, formData: FormData) {
  const user = await requireInternalUser();
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os dados.", saved: false };
  await prisma.setting.upsert({ where: { key: "empresa_dados" }, update: { value: parsed.data, category: "empresa" }, create: { key: "empresa_dados", category: "empresa", value: parsed.data } });
  await logAudit({ actorId: user.id, action: "configuracao_empresa_atualizada", entityType: "other", metadata: parsed.data });
  revalidatePath("/admin/configuracoes/empresa");
  return { error: null, saved: true };
}
