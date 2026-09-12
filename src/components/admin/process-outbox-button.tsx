"use client";

import { useState, useTransition } from "react";
import { processOutboxNow } from "@/app/admin/configuracoes/outbox/actions";
import { buttonClass } from "@/lib/ui";

export function ProcessOutboxButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const r = await processOutboxNow();
            setResult(`${r.processed} lançamento(s) processado(s).`);
          })
        }
        className={buttonClass}
      >
        {isPending ? "Processando…" : "Processar fila agora"}
      </button>
      {result && <span className="text-sm text-forest/60">{result}</span>}
    </div>
  );
}
