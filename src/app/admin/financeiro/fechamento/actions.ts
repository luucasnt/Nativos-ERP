"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireFinancialUser } from "@/lib/auth/get-current-user";
import { logAudit } from "@/lib/audit";

export type ClosingState = { error: string | null };

export async function closeDailyCash(_prev: ClosingState, formData: FormData): Promise<ClosingState> {
  const user = await requireFinancialUser();
  const parsed = z.object({ bank_account_id: z.string().uuid(), counted_balance: z.string().min(1) }).safeParse({ bank_account_id: formData.get("bank_account_id"), counted_balance: formData.get("counted_balance") });
  if (!parsed.success) return { error: "Informe a conta e o saldo contado." };
  const counted = Number(parsed.data.counted_balance.replace(",", "."));
  if (!Number.isFinite(counted)) return { error: "Saldo contado inválido." };
  const account = await prisma.bankAccount.findUnique({ where: { id: parsed.data.bank_account_id } });
  if (!account) return { error: "Conta não encontrada." };
  const start = new Date(); start.setHours(0, 0, 0, 0); const end = new Date(start); end.setDate(end.getDate() + 1);
  const payments = await prisma.payment.findMany({ where: { bank_account_id: account.id, created_at: { gte: start, lt: end }, reversed_at: null, estorno_of_id: null }, select: { type: true, amount: true } });
  const totalIn = payments.filter((p) => p.type === "recebimento").reduce((sum, p) => sum + Number(p.amount), 0);
  const totalOut = payments.filter((p) => p.type === "pagamento").reduce((sum, p) => sum + Number(p.amount), 0);
  const theoretical = Number(account.initial_balance) + totalIn - totalOut;
  const difference = counted - theoretical;
  const existing = await prisma.cashClosing.findFirst({ where: { bank_account_id: account.id, closing_date: { gte: start, lt: end }, reopened_at: null } });
  if (existing) return { error: "Esta conta já possui um fechamento aberto para hoje." };
  const closing = await prisma.cashClosing.create({ data: { bank_account_id: account.id, closing_date: start, opening_balance: account.initial_balance, total_in: totalIn, total_out: totalOut, total_transfers: 0, theoretical_balance: theoretical, counted_balance: counted, difference, difference_type: Math.abs(difference) < 0.01 ? null : "nao_conciliado", performed_by_id: user.id } });
  await logAudit({ actorId: user.id, action: "caixa_fechado", entityType: "other", entityId: closing.id, metadata: { bankAccountId: account.id, difference } });
  revalidatePath("/admin/financeiro/fechamento"); revalidatePath("/admin/financeiro");
  redirect("/admin/financeiro/fechamento?ok=1");
}
