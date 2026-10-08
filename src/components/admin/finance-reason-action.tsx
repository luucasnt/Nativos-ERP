"use client";

import { useState, useTransition } from "react";
import { inputClass, secondaryButtonClass } from "@/lib/ui";

export function FinanceReasonAction({ label, explanation, onConfirm }: {
  label: string; explanation: string; onConfirm: (reason: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  return <div className="space-y-2">
    {!done && <button type="button" className={secondaryButtonClass} disabled={pending} aria-expanded={open} onClick={() => setOpen(!open)}>{label}</button>}
    {open && !done && <form className="grid max-w-xl gap-3 rounded-lg border border-forest/15 p-4" onSubmit={(event) => {
      event.preventDefault();
      if (!window.confirm(`${label}? ${explanation}`)) return;
      startTransition(async () => {
        setError(null);
        try { await onConfirm(reason); setDone(true); setOpen(false); }
        catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível concluir."); }
      });
    }}>
      <p className="text-sm text-forest/70">{explanation}</p>
      <label className="grid gap-1 text-sm text-forest">Motivo obrigatório
        <textarea required minLength={3} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} disabled={pending} className={inputClass} />
      </label>
      <button type="submit" disabled={pending} className={secondaryButtonClass}>{pending ? "Processando…" : "Confirmar"}</button>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </form>}
    {done && <p role="status" className="text-sm text-success">Operação concluída. O histórico foi preservado.</p>}
  </div>;
}
