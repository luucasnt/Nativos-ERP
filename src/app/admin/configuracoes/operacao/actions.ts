"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireInternalUser } from "@/lib/auth/get-current-user";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
const schema = z.object({ airport_wait_minutes: z.coerce.number().int().min(0).max(180), no_show_minutes: z.coerce.number().int().min(0).max(360), service_buffer_minutes: z.coerce.number().int().min(0).max(240), extra_hour_amount: z.coerce.number().min(0).max(100000), default_billing_due_day: z.coerce.number().int().min(1).max(28) });
export async function updateOperationSettings(_prev: { error: string | null; saved: boolean }, formData: FormData) { const user = await requireInternalUser(); const parsed = schema.safeParse(Object.fromEntries(formData.entries())); if (!parsed.success) return { error: "Confira os parâmetros informados.", saved: false }; await prisma.setting.upsert({ where: { key: "operacao_padrao" }, update: { value: parsed.data, category: "operacao" }, create: { key: "operacao_padrao", category: "operacao", value: parsed.data } }); await logAudit({ actorId: user.id, action: "configuracao_operacao_atualizada", entityType: "other", metadata: parsed.data }); revalidatePath("/admin/configuracoes/operacao"); return { error: null, saved: true }; }
