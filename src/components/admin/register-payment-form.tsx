"use client";

import { bahiaDate } from "@/lib/finance/payment-date";
import { useState, useTransition } from "react";
import { CheckCircle2, ChevronDown } from "lucide-react";
import { buttonClass, inputClass } from "@/lib/ui";
import { PAYMENT_METHOD_LABEL } from "@/lib/finance/labels";

type BankAccount = { id: string; name: string };
type RegisterPaymentInput = {
  entryId: string;
  paymentMethod: string;
  amount: string;
  paymentDate?: string;
  bankAccountId?: string;
  receiptUrl?: string;
  dedupeKey: string;
};

export function RegisterPaymentForm({
  entryId,
  remainingAmount,
  bankAccounts,
  onRegister,
  proofRequired = true,
}: {
  entryId: string;
  remainingAmount: string;
  bankAccounts: BankAccount[];
  proofRequired?: boolean;
  onRegister: (input: RegisterPaymentInput) => Promise<void | { error: string | null }>;
}) {
  const [open, setOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [amount, setAmount] = useState(remainingAmount);
  const [bankAccountId, setBankAccountId] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [paymentDate, setPaymentDate] = useState(() => bahiaDate());
  const [dedupeKey, setDedupeKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  return <div className="w-full min-w-0 lg:min-w-[210px]">
    <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="focus-ring inline-flex min-h-10 w-full items-center justify-between gap-2 rounded-lg border border-forest/15 bg-white px-3 text-sm font-semibold text-forest hover:border-forest/30">
      Registrar pagamento <ChevronDown size={15} className={open ? "rotate-180 transition" : "transition"} />
    </button>
    {open && <div className="mt-2 grid gap-2 rounded-xl border border-forest/12 bg-[#faf9f6] p-3 shadow-sm">
      <label className="grid gap-1 text-xs font-medium text-forest/65">Valor recebido ou pago
        <span className="text-xs font-normal">Saldo disponível: R$ {Number(remainingAmount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}. Informe uma parcela ou o valor integral.</span>
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
      <label className="grid gap-1 text-xs font-medium text-forest/65">Data do recebimento / pagamento
        <input type="date" value={paymentDate} max={bahiaDate()} required onChange={event => setPaymentDate(event.target.value)} disabled={isPending} className={inputClass} />
        <span className="text-xs font-normal">Informe a data em que o dinheiro foi recebido ou pago, inclusive em lançamentos retroativos.</span>
      </label>
      <label className="grid gap-1 text-xs font-medium text-forest/65">Anexar comprovante{proofRequired ? " (obrigatório)" : " (opcional)"}
        <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={event => { setProofFile(event.target.files?.[0] ?? null); setReceiptUrl(""); }} disabled={isPending} className={inputClass} />
        <span className="text-xs font-normal">Imagem JPG, PNG, WebP ou PDF. Máximo 4 MB. O arquivo fica privado.</span>
      </label>
      <button type="button" disabled={isPending || !amount} onClick={() => startTransition(async () => {
        setError(null); setSuccess(false);
        const key = dedupeKey || crypto.randomUUID();
        setDedupeKey(key);
        try {
          if (proofRequired && !proofFile && !receiptUrl) throw new Error("Selecione uma imagem ou PDF em Anexar comprovante antes de confirmar o pagamento.");
          if (!paymentDate) throw new Error("Informe a data do recebimento ou pagamento.");
          let proof = receiptUrl;
          if (proofFile && !proof) {
            if (proofFile.size > 4 * 1024 * 1024) throw new Error("O comprovante deve ter até 4 MB.");
            const form = new FormData(); form.set("file", proofFile);
            const response = await fetch("/api/admin/comprovantes", { method: "POST", body: form });
            const result = await response.json();
            if (!response.ok || !result.receiptUrl) throw new Error(result.error || "Não foi possível anexar o comprovante.");
            proof = result.receiptUrl; setReceiptUrl(proof);
          }
          const result = await onRegister({ entryId, paymentMethod, paymentDate, amount: amount.replace(",", "."), bankAccountId: bankAccountId || undefined, receiptUrl: proof || undefined, dedupeKey: key });
          if (result?.error) throw new Error(result.error);
          setSuccess(true); setDedupeKey(""); setProofFile(null); setReceiptUrl(""); setOpen(false);
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
