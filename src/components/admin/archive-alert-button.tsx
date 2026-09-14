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
      className={`${secondaryButtonClass} min-h-11 w-full px-3 text-xs sm:w-auto`}
    >
      Arquivar
    </button>
  );
}
