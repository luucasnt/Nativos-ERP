"use client";

import { useTransition } from "react";
import { buttonClass, secondaryButtonClass } from "@/lib/ui";

type ApprovalActionsProps = {
  onApprove: () => Promise<void>;
  onReject: () => Promise<void>;
};

export function ApprovalActions({ onApprove, onReject }: ApprovalActionsProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex gap-3">
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(onApprove)}
        className={buttonClass}
      >
        Aprovar
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(onReject)}
        className={secondaryButtonClass}
      >
        Rejeitar
      </button>
    </div>
  );
}
