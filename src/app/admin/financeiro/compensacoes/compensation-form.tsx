"use client";

import { useState } from "react";
import { compensateSupplierEntries } from "./actions";
import { buttonClass, inputClass, labelClass } from "@/lib/ui";

type Entry = { id: string; label: string; balance: number };

export function CompensationForm({ payables, receivables }: { payables: Entry[]; receivables: Entry[] }) {
  const [payable, setPayable] = useState("");
  const [receivable, setReceivable] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const selectedPayable = payables.find((entry) => entry.id === payable);
  const selectedReceivable = receivables.find((entry) => entry.id === receivable);
  const max = Math.min(selectedPayable?.balance ?? 0, selectedReceivable?.balance ?? 0);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const value = Number(amount);
    if (!payable || !receivable || !value || value > max) { setMessage(`Informe um valor entre R$ 0,01 e R$ ${max.toFixed(2)}.`); return; }
    try {
      await compensateSupplierEntries({ payableEntryId: payable, receivableEntryId: receivable, amount, dedupeKey: crypto.randomUUID() });
      setMessage("Compensação registrada. O saldo restante permanece no financeiro.");
      setAmount("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível registrar a compensação."); }
  }

  return <form onSubmit={submit} className="grid gap-3 rounded-xl border border-forest/10 bg-[#faf9f6] p-4 md:grid-cols-[1fr_1fr_150px_auto] md:items-end">
    <div><label className={labelClass} htmlFor="payable">Nativos devem ao fornecedor</label><select id="payable" value={payable} onChange={(event) => setPayable(event.target.value)} className={inputClass}><option value="">Selecione uma conta a pagar</option>{payables.map((entry) => <option key={entry.id} value={entry.id}>{entry.label} · saldo R$ {entry.balance.toFixed(2)}</option>)}</select></div>
    <div><label className={labelClass} htmlFor="receivable">Fornecedor deve à Nativos</label><select id="receivable" value={receivable} onChange={(event) => setReceivable(event.target.value)} className={inputClass}><option value="">Selecione uma conta a receber</option>{receivables.map((entry) => <option key={entry.id} value={entry.id}>{entry.label} · saldo R$ {entry.balance.toFixed(2)}</option>)}</select></div>
    <div><label className={labelClass} htmlFor="amount">Valor compensado</label><input id="amount" type="number" min="0.01" max={max || undefined} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className={inputClass} placeholder="R$" /></div>
    <button className={buttonClass} type="submit">Compensar</button>
    {message && <p className="text-xs text-forest/70 md:col-span-4">{message}</p>}
  </form>;
}
