"use client";

import { useState, useTransition } from "react";
import {
  completeService,
  startService,
} from "@/lib/services/service-execution";
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
    <div className="grid w-full gap-1 sm:w-auto">
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
          className={`${buttonClass} min-h-12 w-full px-5 text-sm sm:w-auto`}
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
          className={`${secondaryButtonClass} min-h-12 w-full px-5 text-sm sm:w-auto`}
        >
          Finalizar
        </button>
      )}
      {error && <span className="text-xs leading-5 text-red-700">{error}</span>}
    </div>
  );
}
