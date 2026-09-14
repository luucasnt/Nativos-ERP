"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, ChevronDown } from "lucide-react";
import { buttonClass, inputClass } from "@/lib/ui";
import { PAYMENT_METHOD_LABEL } from "@/lib/finance/labels";

type BankAccount = { id: string; name: string };
type RegisterPaymentInput = {
  entryId: string;
  paymentMethod: string;
  amount: string;
  bankAccountId?: string;
  receiptUrl?: string;
  dedupeKey: string;
};

export function RegisterPaymentForm({
  entryId,
  remainingAmount,
  bankAccounts,
  onRegister,
}: {
  entryId: string;
  remainingAmount: string;
  bankAccounts: BankAccount[];
  onRegister: (input: RegisterPaymentInput) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [amount, setAmount] = useState(remainingAmount);
  const [bankAccountId, setBankAccountId] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [dedupeKey, setDedupeKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  return <div className="min-w-[210px]">
    <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="focus-ring inline-flex min-h-10 w-full items-center justify-between gap-2 rounded-lg border border-forest/15 bg-white px-3 text-sm font-semibold text-forest hover:border-forest/30">
      Informar pagamento <ChevronDown size={15} className={open ? "rotate-180 transition" : "transition"} />
    </button>
    {open && <div className="mt-2 grid gap-2 rounded-xl border border-forest/12 bg-[#faf9f6] p-3 shadow-sm">
      <label className="grid gap-1 text-xs font-medium text-forest/65">Valor pago
        <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" disabled={isPending} className={inputClass} />
      </label>
      <label className="grid gap-1 text-xs font-medium text-forest/65">Forma de pagamento
        <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} disabled={isPending} className={inputClass}>
          {Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-xs font-medium text-forest/65">Conta de destino/origem
        <select value={bankAccountId} onChange={(event) => setBankAccountId(event.target.value)} disabled={isPending} className={inputClass}>
          <option value="">Não informada</option>{bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-xs font-medium text-forest/65">Link do comprovante (obrigatório)
        <input value={receiptUrl} onChange={(event) => setReceiptUrl(event.target.value)} inputMode="url" placeholder="https://..." required disabled={isPending} className={inputClass} />
      </label>
      <button type="button" disabled={isPending || !amount} onClick={() => startTransition(async () => {
        setError(null); setSuccess(false);
        const key = dedupeKey || crypto.randomUUID();
        setDedupeKey(key);
        try {
          await onRegister({ entryId, paymentMethod, amount: amount.replace(",", "."), bankAccountId: bankAccountId || undefined, receiptUrl: receiptUrl || undefined, dedupeKey: key });
          setSuccess(true); setDedupeKey(""); setOpen(false);
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : "Falha ao registrar pagamento.");
        }
      })} className={`${buttonClass} min-h-11 w-full`}>
        {isPending ? "Registrando..." : "Confirmar pagamento"}
      </button>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>}
    {success && <p role="status" className="mt-2 flex items-center gap-1 text-xs font-medium text-success"><CheckCircle2 size={14} /> Pagamento registrado.</p>}
  </div>;
}
