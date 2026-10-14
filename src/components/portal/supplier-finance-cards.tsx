"use client";
import { useActionState, useState } from "react";
import { submitRepasseRequestEmpresa } from "@/app/portal/empresa/actions";
import { SupplierRemittanceForm } from "./supplier-workflow-forms";
import { buttonClass, secondaryButtonClass } from "@/lib/ui";
export type SupplierFinanceCard = { id: string; dedupeKey: string; reservation: string; passenger: string; service: string; date: string; driver: string; total: number; paid: number; balance: number; servicePrice: number | null; supplierCost: number | null; direction: "receber" | "pagar"; eligible: boolean; collectionConfirmed: boolean; serviceId: string | null; pendingProtocol: string | null };
const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const initial: { error: string | null; success?: string } = { error: null };
function RequestPayment({ entryId }: { entryId: string }) {
  const [state, action, pending] = useActionState(submitRepasseRequestEmpresa, initial);
  return <form action={action}><input type="hidden" name="entry_ids" value={entryId} /><input type="hidden" name="dedupe_key" value={entryId} /><button disabled={pending || Boolean(state.success)} className={`${buttonClass} w-full`}>{pending ? "Solicitando..." : "Solicitar meu pagamento"}</button>{state.error && <p role="alert" className="mt-2 text-sm text-danger">{state.error}</p>}{state.success && <p role="status" className="mt-2 text-sm text-success">{state.success}</p>}</form>;
}
export function SupplierFinanceCards({ entries }: { entries: SupplierFinanceCard[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  return <div className="grid gap-3 lg:grid-cols-2">{entries.map(e => <article key={e.id} className="rounded-xl border border-forest/15 bg-white p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-forest">{e.reservation}</strong><span className="text-xs font-semibold text-forest/65">{e.pendingProtocol ? "Aguardando a Nativos" : !e.eligible ? "Aguardando conclusão do serviço" : "Disponível"}</span></div>
    <h3 className="mt-2 text-base font-semibold">{e.passenger}</h3><p className="mt-1 text-sm text-forest/65">{e.service} · {e.date}</p><p className="mt-1 text-xs text-forest/60">Motorista: {e.driver}</p>
    <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-forest/[0.04] p-3 text-sm">
      {e.direction === "pagar" && e.servicePrice !== null && <div><dt className="text-xs text-forest/60">Valor do serviço</dt><dd>{money(e.servicePrice)}</dd></div>}{e.direction === "pagar" && e.supplierCost !== null && <div><dt className="text-xs text-forest/60">Parte do fornecedor</dt><dd>{money(e.supplierCost)}</dd></div>}
      <div><dt className="text-xs text-forest/60">{e.direction === "receber" ? "Valor a receber" : "Repasse total à Nativos"}</dt><dd>{money(e.total)}</dd></div><div><dt className="text-xs text-forest/60">Já liquidado</dt><dd>{money(e.paid)}</dd></div>
      <div className="col-span-2 border-t border-forest/10 pt-2"><dt className="text-xs text-forest/60">{e.direction === "receber" ? "Falta a Nativos pagar" : "Falta repassar à Nativos"}</dt><dd className="mt-1 text-xl font-semibold text-forest">{money(e.balance)}</dd></div>
    </dl>
    <div className="mt-4">{e.pendingProtocol ? <p className="rounded-lg bg-gold/10 p-3 text-sm">Pedido {e.pendingProtocol} em análise. Você não precisa enviar novamente.</p> : !e.eligible ? <p className="text-sm text-forest/65">O pagamento fica disponível após a conclusão do serviço.</p> : e.direction === "receber" ? <RequestPayment entryId={e.id} /> : !e.collectionConfirmed ? <a href={`/portal/empresa/financeiro#recebimento-${e.serviceId}`} className={`${buttonClass} w-full`}>Informar valor e data recebidos do passageiro</a> : <><button className={`${selected === e.id ? secondaryButtonClass : buttonClass} w-full`} onClick={() => setSelected(selected === e.id ? null : e.id)} aria-expanded={selected === e.id}>{selected === e.id ? "Fechar" : "Já transferi à Nativos · enviar comprovante"}</button>{selected === e.id && <div className="mt-3"><SupplierRemittanceForm dedupeKey={e.dedupeKey} entries={[{ id: e.id, label: e.reservation, balance: e.balance }]} /></div>}</>}</div>
  </article>)}</div>;
}
