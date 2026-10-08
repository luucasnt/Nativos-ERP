"use client";
import { useActionState } from "react";
import { createBankAccount } from "./actions";
import { buttonClass, inputClass, labelClass } from "@/lib/ui";
const initial = { error: null, saved: false };
type State = { error: string | null; saved: boolean };
type Values = { name: string; type: string; pix_key: string | null; initial_balance: string };
export function BankAccountForm({ onSave = createBankAccount, defaultValues }: { onSave?: (prev: State, data: FormData) => Promise<State>; defaultValues?: Values }) {
  const [state, action, pending] = useActionState(onSave, initial);
  return <form action={action} className="surface-panel grid gap-3 p-5">
    <h2 className="section-heading">{defaultValues ? "Editar conta" : "Nova conta"}</h2>
    <label><span className={labelClass}>Nome identificador *</span><input name="name" required defaultValue={defaultValues?.name} className={inputClass} placeholder="Conta principal Nativos" /></label>
    <label><span className={labelClass}>Tipo *</span><select name="type" className={inputClass} defaultValue={defaultValues?.type ?? "corrente"}><option value="corrente">Conta corrente</option><option value="poupanca">Poupança</option><option value="digital">Conta digital</option><option value="caixa">Caixa</option></select></label>
    <label><span className={labelClass}>Chave PIX</span><input name="pix_key" defaultValue={defaultValues?.pix_key ?? ""} className={inputClass} /></label>
    <label><span className={labelClass}>Saldo inicial</span><input name="initial_balance" type="number" min="0" step="0.01" defaultValue={defaultValues?.initial_balance ?? "0"} className={inputClass} /></label>
    {defaultValues && <p className="text-xs text-forest/60">O saldo inicial só pode ser alterado antes de pagamentos ou fechamentos.</p>}
    {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}{state.saved && <p role="status" className="text-sm text-success">Conta salva.</p>}
    <button disabled={pending} className={buttonClass}>{pending ? "Salvando…" : defaultValues ? "Salvar alterações" : "Cadastrar conta"}</button>
  </form>;
}
