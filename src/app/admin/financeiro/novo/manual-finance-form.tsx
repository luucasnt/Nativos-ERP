"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createManualFinanceEntry, type ManualFinanceState } from "./actions";
import { buttonClass, inputClass, labelClass, mobileStickyActionClass, secondaryButtonClass } from "@/lib/ui";

export function ManualFinanceForm() {
  const [state, action, pending] = useActionState<ManualFinanceState, FormData>(createManualFinanceEntry, { error: null });
  return <form action={action} className="surface-panel flex max-w-2xl flex-col gap-5 p-5 sm:p-6">
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-1"><span className={labelClass}>Movimento *</span><select name="type" className={inputClass}><option value="receita">Recebimento</option><option value="despesa">Despesa</option></select></label>
      <label className="grid gap-1"><span className={labelClass}>Contraparte *</span><select name="party_type" className={inputClass}><option value="interno">Proprietário / interno</option><option value="cliente">Cliente</option><option value="parceiro">Parceiro</option><option value="fornecedor">Fornecedor</option><option value="motorista">Motorista</option></select></label>
    </div>
    <label className="grid gap-1"><span className={labelClass}>Descrição *</span><input name="description" required className={inputClass} placeholder="Ex.: almoço da equipe, retirada do proprietário, recebimento extra" /></label>
    <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1"><span className={labelClass}>Valor *</span><input name="amount" required inputMode="decimal" className={inputClass} placeholder="0,00" /></label><label className="grid gap-1"><span className={labelClass}>Data de vencimento</span><input name="due_date" type="date" className={inputClass} /></label></div>
    <p className="rounded-lg bg-gold/10 p-3 text-sm leading-5 text-forest/75">Lançamentos avulsos ficam identificados como “manual”, sem vínculo de reserva. Se houver comprovante, registre o pagamento na tela financeira após salvar.</p>
    {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
    <div className={`${mobileStickyActionClass} grid grid-cols-2 gap-2 sm:flex`}><button disabled={pending} className={`${buttonClass} w-full sm:w-auto`}>{pending ? "Salvando…" : "Criar lançamento"}</button><Link href="/admin/financeiro" className={`${secondaryButtonClass} w-full sm:w-auto`}>Cancelar</Link></div>
  </form>;
}
