"use client";

import { useActionState } from "react";
import { submitInvoicePaymentRequest, type ChangeRequestFormState } from "@/app/portal/empresa/actions";
import { buttonClass, inputClass, labelClass } from "@/lib/ui";

const initialState: ChangeRequestFormState = { error: null };

export function InvoicePaymentForm({ cycleId, remaining, dedupeKey }: { cycleId: string; remaining: number; dedupeKey: string }) {
  const [state, formAction, pending] = useActionState(submitInvoicePaymentRequest, initialState);
  return <form action={formAction} className="mt-3 grid gap-3 rounded-lg border border-gold/25 bg-gold/[0.06] p-4 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
    <input type="hidden" name="dedupe_key" value={dedupeKey} /><input type="hidden" name="billing_cycle_id" value={cycleId} />
    <label className={labelClass}>Valor pago (saldo {remaining.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})<input name="amount" type="number" min="0.01" max={remaining} step="0.01" required className={inputClass} /></label>
    <label className={labelClass}>Comprovante (obrigatório)<input name="receipt_url" type="url" placeholder="Link do comprovante" required className={inputClass} /></label>
    <button type="submit" disabled={pending} className={`${buttonClass} min-h-11`}>{pending ? "Enviando…" : "Informar pagamento"}</button>
    {state.error && <p role="alert" className="text-xs text-danger sm:col-span-3">{state.error}</p>}
  </form>;
}
