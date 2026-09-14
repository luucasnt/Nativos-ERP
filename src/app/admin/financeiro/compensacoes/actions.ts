"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireFinancialUser } from "@/lib/auth/get-current-user";
import { logAudit } from "@/lib/audit";
import { createCompensation } from "@/lib/finance/ledger";
import { prisma } from "@/lib/prisma";

export async function compensateSupplierEntries(input: {
  payableEntryId: string;
  receivableEntryId: string;
  amount: string;
  dedupeKey: string;
}) {
  const user = await requireFinancialUser();
  const payableEntryId = z.string().uuid().parse(input.payableEntryId);
  const receivableEntryId = z.string().uuid().parse(input.receivableEntryId);
  const amount = z.coerce.number().positive().parse(input.amount);
  const dedupeKey = z.string().uuid().parse(input.dedupeKey);
  const entries = await prisma.financeEntry.findMany({ where: { id: { in: [payableEntryId, receivableEntryId] } }, select: { id: true, type: true, party_type: true, party_id: true } });
  if (entries.length !== 2 || entries.some((entry) => entry.party_type !== "fornecedor" || !entry.party_id)) throw new Error("Selecione dois lançamentos de fornecedor.");
  if (entries[0].party_id !== entries[1].party_id || !entries.some((entry) => entry.id === payableEntryId && entry.type === "despesa") || !entries.some((entry) => entry.id === receivableEntryId && entry.type === "receita")) throw new Error("Os lançamentos precisam ser obrigações opostas do mesmo fornecedor.");

  const compensation = await createCompensation({
    counterparty_type: "supplier",
    counterparty_id: entries[0].party_id!,
    amount,
    idempotency_key: dedupeKey,
    entryIds: [payableEntryId, receivableEntryId],
  });

  await logAudit({ actorId: user.id, action: "compensacao_fornecedor_criada", entityType: "finance_entry", entityId: payableEntryId, metadata: { compensationId: compensation.id, receivableEntryId, amount: String(amount) } });
  revalidatePath("/admin/financeiro");
  revalidatePath("/admin/financeiro/compensacoes");
}
