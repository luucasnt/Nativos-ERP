"use client";

import { useActionState } from "react";
import { closeDailyCash, type ClosingState } from "./actions";
import { buttonClass, inputClass, labelClass } from "@/lib/ui";

export function ClosingForm({ accounts }: { accounts: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<ClosingState, FormData>(closeDailyCash, { error: null });
  return <form action={action} className="surface-panel grid max-w-xl gap-4 p-5"><label className="grid gap-1"><span className={labelClass}>Conta ou caixa *</span><select name="bank_account_id" required className={inputClass}><option value="">Selecione</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label><label className="grid gap-1"><span className={labelClass}>Saldo contado hoje *</span><input name="counted_balance" required inputMode="decimal" placeholder="0,00" className={inputClass} /></label><p className="rounded-lg bg-gold/10 p-3 text-sm leading-5 text-forest/75">O sistema compara o saldo contado com os recebimentos e pagamentos registrados hoje e guarda a diferença para auditoria.</p>{state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}<button disabled={pending} className={buttonClass}>{pending ? "Fechando…" : "Fechar caixa do dia"}</button></form>;
}
