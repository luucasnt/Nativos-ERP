"use client";

import { useState, useTransition } from "react";
import { buttonClass, inputClass, secondaryButtonClass } from "@/lib/ui";

type ReasonOption = { id: string; label: string };

type DirectCollectionActionsProps = {
  serviceId: string;
  reasons: ReasonOption[];
  onConfirmReceived: (serviceId: string, receiptUrl: string) => Promise<{ error: string | null }>;
  onConfirmNotReceived: (serviceId: string, reasonId: string) => Promise<{ error: string | null }>;
};

export function DirectCollectionActions({
  serviceId,
  reasons,
  onConfirmReceived,
  onConfirmNotReceived,
}: DirectCollectionActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showNotReceived, setShowNotReceived] = useState(false);
  const [reasonId, setReasonId] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState("");

  return (
    <div className="flex w-full flex-col items-stretch gap-2 sm:items-end">
      <div className="grid gap-2 sm:flex">
        <input value={receiptUrl} onChange={(event) => setReceiptUrl(event.target.value)} className={`${inputClass} text-sm`} placeholder="Link do comprovante obrigatório" type="url" aria-label="Comprovante do recebimento" required />
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              setSuccess(null);
              const result = await onConfirmReceived(serviceId, receiptUrl);
              setError(result.error);
              if (!result.error) setSuccess("Recebimento confirmado.");
            })
          }
          className={`${buttonClass} px-3 py-1 text-sm`}
        >
          Recebi o valor
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => setShowNotReceived((v) => !v)}
          className={`${secondaryButtonClass} px-3 py-1 text-sm`}
        >
          Não recebi
        </button>
      </div>
      {showNotReceived && (
        <div className="grid gap-2 sm:flex">
          <select
            value={reasonId}
            onChange={(e) => setReasonId(e.target.value)}
            className={`${inputClass} text-sm`}
          >
            <option value="">Motivo…</option>
            {reasons.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                setSuccess(null);
                const result = await onConfirmNotReceived(serviceId, reasonId);
                setError(result.error);
                if (!result.error) setSuccess("Ocorrência registrada.");
              })
            }
            className={`${secondaryButtonClass} px-3 py-1 text-sm`}
          >
            Confirmar
          </button>
        </div>
      )}
      {error && <span role="alert" className="text-sm text-red-700">{error}</span>}
      {success && <span role="status" className="text-sm text-success">{success}</span>}
    </div>
  );
}
