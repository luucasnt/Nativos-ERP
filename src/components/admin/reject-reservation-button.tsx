"use client";

import { useState, useTransition } from "react";
import { rejectReservationEntirely } from "@/app/admin/reservas/actions";
import { inputClass, secondaryButtonClass } from "@/lib/ui";

export function RejectReservationButton({ reservationId }: { reservationId: string }) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() => setShowConfirm((v) => !v)}
        className={`${secondaryButtonClass} px-3 py-1 text-sm`}
      >
        Rejeitar reserva inteira
      </button>
      {showConfirm && (
        <div className="flex gap-2">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo da rejeição"
            className={`${inputClass} w-64 text-sm`}
          />
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                try {
                  await rejectReservationEntirely(reservationId, reason);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Falha ao rejeitar.");
                }
              })
            }
            className={`${secondaryButtonClass} px-3 py-1 text-sm`}
          >
            Confirmar rejeição
          </button>
        </div>
      )}
      {error && <span className="text-xs text-red-700">{error}</span>}
    </div>
  );
}
