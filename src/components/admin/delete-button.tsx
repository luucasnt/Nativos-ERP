"use client";

import { useState, useTransition } from "react";
import { secondaryButtonClass } from "@/lib/ui";

export function DeleteButton({
  action,
  confirmMessage = "Tem certeza que deseja excluir?",
  label = "Excluir",
}: {
  action: () => Promise<void>;
  confirmMessage?: string;
  label?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div><button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (window.confirm(confirmMessage)) {
          startTransition(async () => {
            setError(null);
            try { await action(); }
            catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível concluir a ação."); }
          });
        }
      }}
      className={secondaryButtonClass}
    >
      {isPending ? "Excluindo…" : label}
    </button>{error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}</div>
  );
}
