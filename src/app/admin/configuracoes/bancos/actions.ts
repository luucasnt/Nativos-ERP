"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { deleteUnusedRecord, deletionError } from "@/lib/admin/delete-record";
import { requireFinancialUser } from "@/lib/auth/get-current-user";
const schema = z.object({ name: z.string().min(2), type: z.enum(["corrente", "poupanca", "digital", "caixa"]), pix_key: z.string().optional(), initial_balance: z.coerce.number().min(0).max(100000000) });
export async function createBankAccount(_prev: { error: string | null; saved: boolean }, formData: FormData) { const user = await requireFinancialUser(); const parsed = schema.safeParse(Object.fromEntries(formData.entries())); if (!parsed.success) return { error: "Confira os dados da conta.", saved: false }; const account = await prisma.bankAccount.create({ data: parsed.data }); await logAudit({ actorId: user.id, action: "conta_bancaria_criada", entityType: "other", entityId: account.id }); revalidatePath("/admin/configuracoes/bancos"); return { error: null, saved: true }; }
export async function toggleBankAccount(id: string, active: boolean) { const user = await requireFinancialUser(); await prisma.bankAccount.update({ where: { id }, data: { active } }); await logAudit({ actorId: user.id, action: active ? "conta_bancaria_ativada" : "conta_bancaria_desativada", entityType: "other", entityId: id }); revalidatePath("/admin/configuracoes/bancos"); }

export async function updateBankAccount(id: string, _prev: { error: string | null; saved: boolean }, formData: FormData) {
  const user = await requireFinancialUser();
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Confira os dados da conta.", saved: false };
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM bank_accounts WHERE id = ${id}::uuid FOR UPDATE`;
      const account = await tx.bankAccount.findUniqueOrThrow({ where: { id }, include: { _count: { select: { payments: true, cash_closings: true } } } });
      if ((account._count.payments || account._count.cash_closings) && !account.initial_balance.equals(parsed.data.initial_balance)) {
        throw new Error("O saldo inicial não pode mudar após pagamentos ou fechamentos. Preserve o histórico financeiro.");
      }
      await tx.bankAccount.update({ where: { id }, data: parsed.data });
      await tx.auditLog.create({ data: { actor_id: user.id, action: "conta_bancaria_atualizada", entity_type: "other", entity_id: id, metadata: { name: parsed.data.name } } });
    });
  } catch (error) { return { error: error instanceof Error ? error.message : "Não foi possível atualizar.", saved: false }; }
  revalidatePath("/admin/configuracoes/bancos");
  revalidatePath("/admin/financeiro");
  return { error: null, saved: true };
}

export async function deleteBankAccount(id: string): Promise<{ error?: string | null }> {
  const user = await requireFinancialUser();
  try { await deleteUnusedRecord("bank", id, user.id); }
  catch (error) { return { error: deletionError(error) }; }
  revalidatePath("/admin/configuracoes/bancos");
  return {};
}
