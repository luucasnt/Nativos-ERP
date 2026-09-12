"use client";

import { useState, useTransition } from "react";
import { acceptServicePortal, rejectServicePortal } from "@/lib/reservations/portal-actions";
import { buttonClass, inputClass, secondaryButtonClass } from "@/lib/ui";

export function ServiceAcceptanceActions({ serviceId }: { serviceId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await acceptServicePortal(serviceId);
              setError(result.error);
            })
          }
          className={`${buttonClass} px-3 py-1 text-sm`}
        >
          Aceitar
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => setShowReject((v) => !v)}
          className={`${secondaryButtonClass} px-3 py-1 text-sm`}
        >
          Recusar
        </button>
      </div>
      {showReject && (
        <div className="flex gap-2">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo"
            className={`${inputClass} w-48 text-sm`}
          />
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await rejectServicePortal(serviceId, reason);
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
