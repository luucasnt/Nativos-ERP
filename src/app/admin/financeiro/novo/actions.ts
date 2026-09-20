"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireFinancialUser } from "@/lib/auth/get-current-user";
import { createFinanceEntry, markFinanceEntryEligible } from "@/lib/finance/ledger";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  type: z.enum(["receita", "despesa"]),
  description: z.string().min(2, "Descreva o lançamento."),
  amount: z.string().refine((v) => Number(v.replace(",", ".")) > 0, "Informe um valor maior que zero."),
  due_date: z.string().optional(),
  party_type: z.enum(["cliente", "motorista", "fornecedor", "parceiro", "interno"]),
});

export type ManualFinanceState = { error: string | null };

export async function createManualFinanceEntry(_prev: ManualFinanceState, formData: FormData): Promise<ManualFinanceState> {
  const user = await requireFinancialUser();
  const parsed = schema.safeParse({ type: formData.get("type"), description: formData.get("description"), amount: formData.get("amount"), due_date: formData.get("due_date") || undefined, party_type: formData.get("party_type") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const amount = Number(parsed.data.amount.replace(",", "."));
  const entry = await createFinanceEntry({
    type: parsed.data.type,
    category: "outro",
    amount,
    party_type: parsed.data.party_type,
    origin_type: "manual",
    origin_id: null,
    description: parsed.data.description,
    due_date: parsed.data.due_date ? new Date(`${parsed.data.due_date}T12:00:00Z`) : null,
    auto_key: `manual:${crypto.randomUUID()}`,
  });
  await markFinanceEntryEligible(entry.id);
  await logAudit({ actorId: user.id, action: "lancamento_avulso_criado", entityType: "finance_entry", entityId: entry.id, metadata: { type: parsed.data.type, amount } });
  revalidatePath("/admin/financeiro");
  redirect(`/admin/financeiro?status=pendente&q=${encodeURIComponent(parsed.data.description)}`);
}
