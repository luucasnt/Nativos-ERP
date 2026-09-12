"use client";

import { useState, useTransition } from "react";
import { buttonClass, inputClass, secondaryButtonClass } from "@/lib/ui";

type ReasonOption = { id: string; label: string };

type DirectCollectionActionsProps = {
  serviceId: string;
  reasons: ReasonOption[];
  onConfirmReceived: (serviceId: string) => Promise<{ error: string | null }>;
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

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await onConfirmReceived(serviceId);
              setError(result.error);
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
        <div className="flex gap-2">
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
                const result = await onConfirmNotReceived(serviceId, reasonId);
                setError(result.error);
              })
            }
            className={`${secondaryButtonClass} px-3 py-1 text-sm`}
          >
            Confirmar
          </button>
        </div>
      )}
      {error && <span className="text-xs text-red-700">{error}</span>}
    </div>
  );
}
