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
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(onApprove)}
        className={`${buttonClass} w-full sm:w-auto`}
      >
        Aprovar
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(onReject)}
        className={`${secondaryButtonClass} w-full sm:w-auto`}
      >
        Rejeitar
      </button>
    </div>
  );
}
