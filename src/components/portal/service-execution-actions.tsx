"use client";

import { useState, useTransition } from "react";
import { completeService, startService } from "@/lib/services/service-execution";
import { buttonClass, secondaryButtonClass } from "@/lib/ui";

export function ServiceExecutionActions({
  serviceId,
  executionStatus,
}: {
  serviceId: string;
  executionStatus: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (executionStatus === "concluido" || executionStatus === "cancelado") {
    return null;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {executionStatus === "agendado" && (
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await startService(serviceId);
              setError(result.error);
            })
          }
          className={`${buttonClass} px-3 py-1 text-sm`}
        >
          Iniciar
        </button>
      )}
      {executionStatus === "em_andamento" && (
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await completeService(serviceId);
              setError(result.error);
            })
          }
          className={`${secondaryButtonClass} px-3 py-1 text-sm`}
        >
          Finalizar
        </button>
      )}
      {error && <span className="text-xs text-red-700">{error}</span>}
    </div>
  );
}
