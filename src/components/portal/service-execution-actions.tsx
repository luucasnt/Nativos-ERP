"use client";

import { useState, useTransition } from "react";
import {
  completeService,
  startService,
} from "@/lib/services/service-execution";
import { CheckCircle2, LoaderCircle, Play } from "lucide-react";
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
          {isPending ? <LoaderCircle className="animate-spin" size={17} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
          {isPending ? "Iniciando serviço..." : "Iniciar serviço"}
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
          {isPending ? <LoaderCircle className="animate-spin" size={17} aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}
          {isPending ? "Finalizando..." : "Finalizar serviço"}
        </button>
      )}
      {error && <span role="alert" className="rounded-lg bg-danger-light px-3 py-2 text-xs leading-5 text-danger">{error}</span>}
    </div>
  );
}
