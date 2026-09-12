"use client";

import { useState, useTransition } from "react";
import { buttonClass } from "@/lib/ui";
import { PAYMENT_METHOD_LABEL } from "@/lib/finance/labels";

type RegisterPaymentFormProps = {
  entryId: string;
  onRegister: (entryId: string, paymentMethod: string) => Promise<void>;
};

export function RegisterPaymentForm({ entryId, onRegister }: RegisterPaymentFormProps) {
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <select
        value={paymentMethod}
        onChange={(e) => setPaymentMethod(e.target.value)}
        disabled={isPending}
        className="rounded-sm border border-forest/20 bg-white px-2 py-1 text-sm text-ink outline-none focus:border-gold"
      >
        {Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              await onRegister(entryId, paymentMethod);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Falha ao registrar pagamento.");
            }
          })
        }
        className={`${buttonClass} px-3 py-1 text-xs`}
      >
        Registrar pagamento
      </button>
      {error && <span className="text-xs text-red-700">{error}</span>}
    </div>
  );
}
