"use client";

import { useActionState } from "react";
import { submitInvoiceAdvanceRequest, type ChangeRequestFormState } from "@/app/portal/empresa/actions";
import { buttonClass, inputClass, labelClass } from "@/lib/ui";

const initialState: ChangeRequestFormState = { error: null };

export function InvoiceAdvanceForm({
  cycleId,
  remaining,
  dedupeKey,
}: {
  cycleId: string;
  remaining: number;
  dedupeKey: string;
}) {
  const [state, formAction, pending] = useActionState(submitInvoiceAdvanceRequest, initialState);
  return (
    <form action={formAction} className="mt-4 grid gap-3 rounded-lg bg-forest/[0.035] p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <input type="hidden" name="dedupe_key" value={dedupeKey} />
      <input type="hidden" name="billing_cycle_id" value={cycleId} />
      <div className="flex flex-col gap-1"><label className={labelClass} htmlFor={`advance-${cycleId}`}>Valor a antecipar (saldo {remaining.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})</label><input id={`advance-${cycleId}`} name="amount" type="number" min="0.01" max={remaining} step="0.01" required className={inputClass} /></div>
      <div className="flex flex-col gap-1"><label className={labelClass} htmlFor={`advance-note-${cycleId}`}>Observação</label><input id={`advance-note-${cycleId}`} name="nota" required className={inputClass} placeholder="Ex.: antecipação de caixa" /></div>
      <button type="submit" disabled={pending} className={`${buttonClass} min-h-10`}>{pending ? "Enviando…" : "Solicitar antecipação"}</button>
      {state.error && <p role="status" className="text-xs text-red-700 sm:col-span-3">{state.error}</p>}
    </form>
  );
}
