"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireFinancialUser } from "@/lib/auth/get-current-user";
import { closeCash, reopenCash } from "@/lib/finance/cash-closing";
export type ClosingState = { error: string | null };
export async function closeDailyCash(_prev: ClosingState, formData: FormData): Promise<ClosingState> {
  const user = await requireFinancialUser();
  const parsed = z.object({ bank_account_id: z.uuid(), counted_balance: z.string() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Informe a conta e o saldo contado." };
  try { await closeCash(parsed.data.bank_account_id, parsed.data.counted_balance, user.id); }
  catch (error) { return { error: error instanceof Error ? error.message : "Não foi possível fechar o caixa." }; }
  revalidatePath("/admin/financeiro/fechamento"); revalidatePath("/admin/financeiro");
  redirect("/admin/financeiro/fechamento?ok=1");
}
export async function reopenDailyCash(id: string, reason: string) {
  const user = await requireFinancialUser();
  if (!z.uuid().safeParse(id).success) throw new Error("Fechamento inválido.");
  await reopenCash(id, reason, user.id);
  revalidatePath("/admin/financeiro/fechamento"); revalidatePath("/admin/financeiro");
}
