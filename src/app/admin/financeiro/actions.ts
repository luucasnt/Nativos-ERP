"use server";

import { parsePaymentDate } from "@/lib/finance/payment-date";
import { validatePaymentProof } from "@/lib/uploads/payment-proof";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireFinancialUser } from "@/lib/auth/get-current-user";
import { logAudit } from "@/lib/audit";
import { createPayment, reversePayment } from "@/lib/finance/ledger";
import { cancelStandaloneManualEntry, isStandaloneManualEntry, manualEntrySchema, moneyInput, updateStandaloneManualEntry } from "@/lib/finance/manual-entry";
import { notifyCompanyPortalUsers, notifyDriverPortalUser } from "@/lib/notifications";

const paymentMethodSchema = z.enum(["pix", "cartao", "dinheiro", "transferencia", "boleto", "outro"]);

// Registro manual de pagamento pelo painel. A chave nasce no formulário e
// permanece igual durante retries, permitindo múltiplas parcelas reais sem
// permitir que o mesmo clique seja contabilizado duas vezes.
export async function registerPayment(input: {
  entryId: string;
  paymentMethod: string;
  amount: string;
  paymentDate?: string;
  bankAccountId?: string;
  receiptUrl?: string;
  dedupeKey: string;
}) {
  const user = await requireFinancialUser();
  const paymentMethod = paymentMethodSchema.parse(input.paymentMethod);
  const amount = moneyInput.parse(input.amount);
  z.string().uuid().parse(input.entryId);
  z.string().uuid().parse(input.dedupeKey);
  const bankAccountId = input.bankAccountId ? z.string().uuid().parse(input.bankAccountId) : null;
  const occurredAt = input.paymentDate ? parsePaymentDate(input.paymentDate) : undefined;
  const receiptUrl = await validatePaymentProof(input.receiptUrl, user.id);

  const entry = await prisma.financeEntry.findUniqueOrThrow({ where: { id: input.entryId } });
  const requiresProof = ["fornecedor", "parceiro", "cliente"].includes(entry.party_type);
  if (requiresProof && !receiptUrl) {
    throw new Error("O comprovante é obrigatório para pagamentos de fornecedor, parceiro ou cliente.");
  }
  if (requiresProof && !entry.reservation_id && !isStandaloneManualEntry(entry)) {
    throw new Error("Este lançamento não está vinculado a uma reserva e não pode ser liquidado automaticamente.");
  }

  await createPayment({
    finance_entry_id: input.entryId,
    type: entry.type === "receita" ? "recebimento" : "pagamento",
    amount,
    occurred_at: occurredAt,
    payment_method: paymentMethod as PaymentMethod,
    bank_account_id: bankAccountId,
    receipt_url: receiptUrl,
    dedupe_key: input.dedupeKey,
  });

  // Só notifica quando é a Nativos pagando/repassando à contraparte (não
  // quando é ela quem remete dinheiro à Nativos) — é esse sentido que o
  // tipo "repasse_confirmado" descreve.
  const sideEffects: Promise<unknown>[] = [];
  if (entry.type === "despesa" && entry.party_id) {
    if (entry.party_type === "motorista") {
      sideEffects.push(notifyDriverPortalUser({
        driverId: entry.party_id,
        type: "repasse_confirmado",
        message: "Um repasse foi confirmado no seu extrato financeiro.",
        entityRefType: "finance_entry",
        entityRefId: entry.id,
      }));
    } else if (entry.party_type === "fornecedor") {
      sideEffects.push(notifyCompanyPortalUsers({
        companyId: entry.party_id,
        type: "repasse_confirmado",
        message: "Um repasse foi confirmado no seu extrato financeiro.",
        entityRefType: "finance_entry",
        entityRefId: entry.id,
      }));
    }
  }

  sideEffects.push(logAudit({
    actorId: user.id,
    action: "pagamento_registrado",
    entityType: "finance_entry",
    entityId: input.entryId,
    metadata: { amount: String(amount), paymentMethod, effectiveDate: occurredAt?.toISOString() ?? null },
  }));

  // O pagamento já foi confirmado atomicamente. Falha de e-mail ou outbox
  // não pode transformar uma liquidação bem-sucedida em erro para o usuário.
  await Promise.allSettled(sideEffects);

  revalidatePath("/admin/financeiro");
  if (entry.reservation_id) revalidatePath(`/admin/reservas/${entry.reservation_id}`);
}

export async function updateManualEntry(id: string, _prev: { error: string | null }, formData: FormData) {
  const user = await requireFinancialUser();
  const parsed = manualEntrySchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  try {
    await updateStandaloneManualEntry(id, parsed.data, user.id, String(formData.get("updated_at")));
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Não foi possível atualizar." };
  }
  revalidatePath("/admin/financeiro");
  revalidatePath(`/admin/financeiro/${id}`);
  return { error: null };
}

export async function cancelManualEntry(id: string, reason: string) {
  const user = await requireFinancialUser();
  await cancelStandaloneManualEntry(id, reason, user.id);
  revalidatePath("/admin/financeiro");
  revalidatePath(`/admin/financeiro/${id}`);
}

export async function reverseRegisteredPayment(paymentId: string, reason: string) {
  const user = await requireFinancialUser();
  z.string().uuid().parse(paymentId);
  const note = z.string().trim().min(3, "Informe o motivo do estorno.").max(1000).parse(reason);
  const reversal = await reversePayment(paymentId, {
    actorId: user.id, reason: note, dedupeKey: `admin:estorno:${paymentId}`, audit: true,
  });
  const entry = await prisma.financeEntry.findUniqueOrThrow({ where: { id: reversal.finance_entry_id } });
  revalidatePath("/admin/financeiro");
  revalidatePath(`/admin/financeiro/${entry.id}`);
  revalidatePath("/portal/empresa", "layout");
  revalidatePath("/portal/motorista", "layout");
  if (entry.reservation_id) revalidatePath(`/admin/reservas/${entry.reservation_id}`);
}
