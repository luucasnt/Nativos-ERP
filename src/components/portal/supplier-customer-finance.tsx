"use client";
import { useActionState, useState, useTransition } from "react";
import { registerSupplierCustomerReceipt, confirmNotReceivedPortalEmpresa } from "@/app/portal/empresa/actions";
import { SupplierRemittanceForm } from "./supplier-workflow-forms";
import { bahiaDate } from "@/lib/finance/payment-date";
import { buttonClass, inputClass, secondaryButtonClass } from "@/lib/ui";
export type SupplierCustomerService = {
  id: string; dedupeKey: string; reservation: string; passenger: string; service: string; date: string; driver: string;
  expected: number; received: number; customerBalance: number; supplierShare: number; repasseTotal: number; repassePaid: number; repasseBalance: number; gain: number;
  legacyUnknown: boolean; completed: boolean; entryId: string | null; pendingProtocol: string | null;
  receipts: { amount: number; date: string; proofUrl?: string | null }[]; remittances: { amount: number; date: string }[];
};
const money = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
function CustomerReceiptForm({ service }: { service: SupplierCustomerService }) {
  const [state, action, pending] = useActionState(registerSupplierCustomerReceipt, { error: null } as { error: string | null; success?: string });
  const [receipt, setReceipt] = useState(""); const [uploading, setUploading] = useState(false); const [error, setError] = useState<string | null>(null);
  return <form action={action} className="mt-3 grid gap-3">
    <input type="hidden" name="service_id" value={service.id} /><input type="hidden" name="dedupe_key" value={service.dedupeKey} /><input type="hidden" name="receipt_url" value={receipt} />
    <label className="grid gap-1 text-sm">Valor recebido agora do passageiro<input name="amount" required type="number" min="0.01" step="0.01" max={service.customerBalance} defaultValue={service.customerBalance.toFixed(2)} className={inputClass} /></label>
    <label className="grid gap-1 text-sm">Data do recebimento do passageiro<input name="payment_date" required type="date" defaultValue={bahiaDate()} max={bahiaDate()} className={inputClass} /></label>
    <label className="grid gap-1 text-sm">Comprovante do passageiro (opcional, imagem ou PDF)<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={pending || uploading} className={inputClass} onChange={async e => { const file = e.target.files?.[0]; setReceipt(""); setError(null); if (!file) return; setUploading(true); try { const body = new FormData(); body.set("file", file); const response = await fetch("/api/portal/comprovantes", { method: "POST", body }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Falha ao anexar."); setReceipt(data.receiptUrl); } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao anexar."); } finally { setUploading(false); } }} /></label>
    <p className="text-xs text-forest/65">Informe somente o que você recebeu nesta vez. Este registro fica no seu controle e não é uma transferência à Nativos.</p>
    <button disabled={pending || uploading || Boolean(state.success)} className={buttonClass}>{pending ? "Registrando..." : "Registrar recebimento do passageiro"}</button>
    {(error || state.error) && <p role="alert" className="text-sm text-danger">{error ?? state.error}</p>}{state.success && <p role="status" className="text-sm text-success">{state.success}</p>}
  </form>;
}
function SupplierNonReceipt({ serviceId, reasons }: { serviceId: string; reasons: { id: string; label: string }[] }) {
  const [pending, start] = useTransition(); const [reason, setReason] = useState(""); const [message, setMessage] = useState<string | null>(null);
  return <details className="mt-3 text-sm"><summary className="cursor-pointer text-forest/70">Passageiro ainda não pagou · registrar ocorrência</summary><div className="mt-3 grid gap-2"><label className="grid gap-1">Motivo do não recebimento<select className={inputClass} value={reason} onChange={e => setReason(e.target.value)}><option value="">Selecione</option>{reasons.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}</select></label><button type="button" disabled={pending || !reason} className={secondaryButtonClass} onClick={() => start(async () => { try { const result = await confirmNotReceivedPortalEmpresa(serviceId, reason); setMessage(result.error ?? "Ocorrência registrada para a equipe Nativos."); } catch { setMessage("Não foi possível registrar. Tente novamente."); } })}>{pending ? "Registrando..." : "Informar que não recebi"}</button>{message && <p role="status">{message}</p>}</div></details>;
}
function CustomerServiceCard({ service: s, reasons }: { service: SupplierCustomerService; reasons: { id: string; label: string }[] }) {
  const [showReceipt, setShowReceipt] = useState(false); const [showRepasse, setShowRepasse] = useState(false);
  return <article id={`recebimento-${s.id}`} className="scroll-mt-24 rounded-xl border border-forest/15 bg-white p-4">
    <div className="flex flex-wrap justify-between gap-2"><strong className="text-sm text-forest">{s.reservation}</strong><span className="text-xs text-forest/65">{!s.completed ? "Serviço ainda não concluído" : s.pendingProtocol ? "Transferência em conferência" : s.repasseBalance === 0 && s.customerBalance === 0 ? "Recebimento e repasse concluídos" : "Valores a acompanhar"}</span></div>
    <h3 className="mt-2 font-semibold">{s.passenger}</h3><p className="mt-1 text-sm text-forest/65">{s.service} · {s.date}</p><p className="mt-1 text-xs text-forest/60">Motorista: {s.driver}</p>
    <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-forest/[0.04] p-3 text-sm">
      <div><dt className="text-xs text-forest/65">A receber do passageiro</dt><dd>{money(s.expected)}</dd></div>
      <div><dt className="text-xs text-forest/65">Você recebeu do passageiro</dt><dd className="font-semibold">{s.legacyUnknown ? "Valor antigo não informado" : money(s.received)}</dd></div>
      <div><dt className="text-xs text-forest/65">Falta o passageiro pagar</dt><dd>{money(s.customerBalance)}</dd></div>
      <div><dt className="text-xs text-forest/65">Sua parte contratada</dt><dd>{money(s.supplierShare)}</dd></div>
      <div><dt className="text-xs text-forest/65">Repasse combinado à Nativos</dt><dd>{money(s.repasseTotal)}</dd></div>
      <div><dt className="text-xs text-forest/65">Você já repassou à Nativos</dt><dd>{money(s.repassePaid)}</dd></div>
      <div className="border-t border-forest/10 pt-2"><dt className="text-xs text-forest/65">Falta repassar à Nativos</dt><dd className="mt-1 text-lg font-semibold">{money(s.repasseBalance)}</dd></div>
      <div className="border-t border-forest/10 pt-2"><dt className="text-xs text-forest/65">Seu ganho após quitar o repasse</dt><dd className="mt-1 text-lg font-semibold">{s.legacyUnknown ? "A confirmar" : money(s.gain)}</dd></div>
    </dl>
    <p className="mt-2 text-xs text-forest/65">O ganho considera os valores recebidos e o repasse combinado, antes das suas despesas próprias. Só o repasse entra no financeiro da Nativos.</p>
    {s.legacyUnknown && <p className="mt-3 rounded-lg bg-gold/10 p-3 text-sm">A confirmação antiga não informou o valor real recebido do passageiro. Registre esse valor e a data abaixo. O repasse já confirmado será preservado.</p>}
    {s.completed && s.customerBalance > 0 && <div className="mt-4"><button type="button" className={`${showReceipt ? secondaryButtonClass : buttonClass} w-full`} onClick={() => setShowReceipt(!showReceipt)} aria-expanded={showReceipt}>{showReceipt ? "Fechar recebimento" : "Recebi do passageiro · registrar valor e data"}</button>{showReceipt && <CustomerReceiptForm key={s.dedupeKey} service={s} />}</div>}
    {s.completed && s.received === 0 && reasons.length > 0 && <SupplierNonReceipt serviceId={s.id} reasons={reasons} />}
    {s.repasseBalance > 0 && <div className="mt-3">{s.pendingProtocol ? <p className="rounded-lg bg-gold/10 p-3 text-sm">Transferência {s.pendingProtocol} aguardando conferência da Nativos. O saldo só baixa após a confirmação.</p> : s.completed && s.received > 0 && s.entryId ? <><button type="button" className={`${showRepasse ? secondaryButtonClass : buttonClass} w-full`} onClick={() => setShowRepasse(!showRepasse)} aria-expanded={showRepasse}>{showRepasse ? "Fechar transferência" : "Transferi para a Nativos · informar repasse"}</button>{showRepasse && <div className="mt-3"><SupplierRemittanceForm dedupeKey={s.dedupeKey} entries={[{ id: s.entryId, label: s.reservation, balance: Math.min(s.repasseBalance, Math.max(0, s.received - s.repassePaid)) }]} /></div>}</> : <p className="text-sm text-forest/65">Registre o valor recebido do passageiro para informar o repasse.</p>}</div>}
    {(s.receipts.length > 0 || s.remittances.length > 0) && <div className="mt-4 border-t border-forest/10 pt-3"><h4 className="text-sm font-semibold">Histórico deste serviço</h4><ul className="mt-2 grid gap-2 text-xs text-forest/70">{s.receipts.map((r,i) => <li key={`receipt-${i}`}>Recebido do passageiro: {money(r.amount)} · {r.date}{r.proofUrl && <a href={r.proofUrl} target="_blank" rel="noopener noreferrer" className="ml-2 underline">Ver comprovante do passageiro</a>}</li>)}{s.remittances.map((r,i) => <li key={`repasse-${i}`}>Repasse confirmado à Nativos: {money(r.amount)} · {r.date}</li>)}</ul></div>}
  </article>;
}
export function SupplierCustomerFinance({ services, reasons = [] }: { services: SupplierCustomerService[]; reasons?: { id: string; label: string }[] }) {
  return <section id="recebimentos" className="surface-panel p-4 sm:p-5"><h3 className="text-lg font-semibold">Passageiro paga ao fornecedor</h3><p className="mb-4 mt-1 text-sm text-forest/65">Recebimento do passageiro, sua parte e repasse à Nativos, separados por serviço.</p>{services.length ? <div className="grid gap-4 lg:grid-cols-2">{services.map(s => <CustomerServiceCard key={s.id} service={s} reasons={reasons} />)}</div> : <p className="text-sm text-forest/60">Nenhum serviço de cobrança direta atribuído à sua empresa.</p>}</section>;
}
