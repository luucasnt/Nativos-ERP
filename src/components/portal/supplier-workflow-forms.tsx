"use client";
import { useActionState, useState } from "react";
import { reportSupplierRemittance, requestSupplierDriverAccess } from "@/app/portal/empresa/actions";
import { buttonClass, inputClass } from "@/lib/ui";
import { bahiaDate } from "@/lib/finance/payment-date";
const initial: { error: string | null; success?: string } = { error: null as string | null };
export function SupplierDriverAccessForm({ driverId, email, dedupeKey }: { driverId: string; email: string | null; dedupeKey: string }) {
  const [state, action, pending] = useActionState(requestSupplierDriverAccess, initial);
  return <form action={action} className="grid gap-2 border-t border-forest/10 p-4">
    <input type="hidden" name="driver_id" value={driverId} /><input type="hidden" name="dedupe_key" value={dedupeKey} />
    <label className="grid gap-1 text-xs text-forest">E-mail pessoal do motorista<input name="email" type="email" required defaultValue={email ?? ""} className={inputClass} /></label>
    <button disabled={pending || Boolean(state.success)} className={buttonClass}>{pending ? "Solicitando..." : "Solicitar acesso ao portal do motorista"}</button>
    {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}{state.success && <p role="status" className="text-sm text-success">{state.success}</p>}
  </form>;
}
export function SupplierRemittanceForm({ entries, dedupeKey }: { entries: { id: string; label: string }[]; dedupeKey: string }) {
  const [state, action, pending] = useActionState(reportSupplierRemittance, initial);
  const [receipt, setReceipt] = useState(""); const [uploading, setUploading] = useState(false); const [error, setError] = useState<string | null>(null);
  return <form action={action} className="grid max-w-xl gap-3">
    <input type="hidden" name="dedupe_key" value={dedupeKey} /><input type="hidden" name="receipt_url" value={receipt} />
    <label className="grid gap-1 text-sm">Serviço e saldo a repassar<select required name="entry_id" className={inputClass}><option value="">Selecione o serviço</option>{entries.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}</select></label>
    <label className="grid gap-1 text-sm">Valor transferido à Nativos<input required name="amount" type="number" min="0.01" step="0.01" className={inputClass} /></label>
    <label className="grid gap-1 text-sm">Data do pagamento<input required type="date" name="payment_date" defaultValue={bahiaDate()} max={bahiaDate()} className={inputClass} /></label>
    <label className="grid gap-1 text-sm">Forma de pagamento<select name="payment_method" className={inputClass}><option value="pix">Pix</option><option value="transferencia">Transferência</option><option value="dinheiro">Dinheiro</option><option value="cartao">Cartão</option><option value="boleto">Boleto</option><option value="outro">Outro</option></select></label>
    <label className="grid gap-1 text-sm">Comprovante (imagem ou PDF, até 4 MB)<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={pending || uploading} onChange={async e => { const file = e.target.files?.[0]; setReceipt(""); setError(null); if (!file) return; setUploading(true); try { const body = new FormData(); body.set("file", file); const response = await fetch("/api/portal/comprovantes", { method: "POST", body }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Falha ao anexar."); setReceipt(data.receiptUrl); } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao anexar."); } finally { setUploading(false); } }} className={inputClass} /></label>
    {uploading && <p role="status">Anexando comprovante...</p>}{receipt && <p className="text-xs text-success">Comprovante anexado.</p>}
    <label className="grid gap-1 text-sm">Observação (opcional)<textarea name="nota" rows={2} maxLength={800} className={inputClass} /></label>
    {(error || state.error) && <p role="alert" className="text-sm text-danger">{error ?? state.error}</p>}{state.success && <p role="status" className="text-sm text-success">{state.success}</p>}
    <button disabled={pending || uploading || !receipt || Boolean(state.success)} className={buttonClass}>{pending ? "Enviando..." : "Informar pagamento à Nativos"}</button>
  </form>;
}
