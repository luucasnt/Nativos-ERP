"use client";

import { useTransition } from "react";
import { archiveAlertAction } from "@/app/admin/alertas/actions";
import { secondaryButtonClass } from "@/lib/ui";

export function ArchiveAlertButton({ alertId }: { alertId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => archiveAlertAction(alertId))}
      className={`${secondaryButtonClass} px-3 py-1 text-xs`}
    >
      Arquivar
    </button>
  );
}
