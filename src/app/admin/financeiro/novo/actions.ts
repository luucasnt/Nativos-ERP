"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireFinancialUser } from "@/lib/auth/get-current-user";
import { createStandaloneManualEntry, manualEntrySchema } from "@/lib/finance/manual-entry";

export type ManualFinanceState = { error: string | null };

export async function createManualFinanceEntry(_prev: ManualFinanceState, formData: FormData): Promise<ManualFinanceState> {
  const user = await requireFinancialUser();
  const parsed = manualEntrySchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  let entry;
  try {
    entry = await createStandaloneManualEntry(parsed.data, user.id, String(formData.get("dedupe_key")));
  } catch {
    return { error: "Não foi possível criar o lançamento. Atualize a página e tente novamente." };
  }
  revalidatePath("/admin/financeiro");
  redirect(`/admin/financeiro/${entry.id}`);
}
