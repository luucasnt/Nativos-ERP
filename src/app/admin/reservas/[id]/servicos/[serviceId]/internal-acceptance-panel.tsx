"use client";

import { useState, useTransition } from "react";
import { acceptServiceInternal, rejectServiceInternal } from "../actions";
import { buttonClass, inputClass, secondaryButtonClass } from "@/lib/ui";

export function InternalAcceptancePanel({
  reservationId,
  serviceId,
}: {
  reservationId: string;
  serviceId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-sm bg-gold/10 p-4">
      <p className="text-sm text-forest">
        Este serviço aguarda o aceite do fornecedor. Você pode registrar o
        aceite/recusa aqui em nome dele (ex.: confirmação por telefone) ou
        aguardar a resposta pelo portal.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => acceptServiceInternal(reservationId, serviceId))}
          className={buttonClass}
        >
          Registrar aceite
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => setShowReject((v) => !v)}
          className={secondaryButtonClass}
        >
          Registrar recusa
        </button>
      </div>
      {showReject && (
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo da recusa"
            className={`${inputClass} max-w-sm`}
          />
          <button
            type="button"
            disabled={isPending || !reason}
            onClick={() =>
              startTransition(() => rejectServiceInternal(reservationId, serviceId, reason))
            }
            className={secondaryButtonClass}
          >
            Confirmar recusa
          </button>
        </div>
      )}
    </div>
  );
}
