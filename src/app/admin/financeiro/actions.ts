"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireInternalUser } from "@/lib/auth/get-current-user";
import { logAudit } from "@/lib/audit";
import { createPayment } from "@/lib/finance/ledger";

const paymentMethodSchema = z.enum(["pix", "cartao", "dinheiro", "transferencia", "boleto", "outro"]);

// Registro manual de pagamento pelo painel — a contraparte do motor
// automático (settlement.ts), que só programa lançamentos. dedupe_key
// determinístico (um por lançamento) faz de um clique duplo, ou de um
// retry de rede, uma chamada segura: devolve o Payment já criado em vez
// de duplicar.
export async function registerPayment(entryId: string, paymentMethodInput: string) {
  const user = await requireInternalUser();
  const paymentMethod = paymentMethodSchema.parse(paymentMethodInput);

  const entry = await prisma.financeEntry.findUniqueOrThrow({ where: { id: entryId } });

  if (!entry.payment_eligible || entry.status !== "pendente") {
    throw new Error("Este lançamento não está elegível para pagamento.");
  }

  await createPayment({
    finance_entry_id: entryId,
    type: entry.type === "receita" ? "recebimento" : "pagamento",
    amount: entry.amount,
    payment_method: paymentMethod as PaymentMethod,
    dedupe_key: `manual:${entryId}`,
  });

  await logAudit({
    actorId: user.id,
    action: "pagamento_registrado",
    entityType: "finance_entry",
    entityId: entryId,
  });

  revalidatePath("/admin/financeiro");
}
