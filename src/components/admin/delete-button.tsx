"use client";

import { useTransition } from "react";
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

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (window.confirm(confirmMessage)) {
          startTransition(action);
        }
      }}
      className={secondaryButtonClass}
    >
      {isPending ? "Excluindo…" : label}
    </button>
  );
}
