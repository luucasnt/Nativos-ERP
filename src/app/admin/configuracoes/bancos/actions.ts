"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireInternalUser } from "@/lib/auth/get-current-user";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
const schema = z.object({ name: z.string().min(2), type: z.enum(["corrente", "poupanca", "digital", "caixa"]), pix_key: z.string().optional(), initial_balance: z.coerce.number().min(0).max(100000000) });
export async function createBankAccount(_prev: { error: string | null; saved: boolean }, formData: FormData) { const user = await requireInternalUser(); const parsed = schema.safeParse(Object.fromEntries(formData.entries())); if (!parsed.success) return { error: "Confira os dados da conta.", saved: false }; const account = await prisma.bankAccount.create({ data: parsed.data }); await logAudit({ actorId: user.id, action: "conta_bancaria_criada", entityType: "other", entityId: account.id }); revalidatePath("/admin/configuracoes/bancos"); return { error: null, saved: true }; }
export async function toggleBankAccount(id: string, active: boolean) { const user = await requireInternalUser(); await prisma.bankAccount.update({ where: { id }, data: { active } }); await logAudit({ actorId: user.id, action: active ? "conta_bancaria_ativada" : "conta_bancaria_desativada", entityType: "other", entityId: id }); revalidatePath("/admin/configuracoes/bancos"); }
