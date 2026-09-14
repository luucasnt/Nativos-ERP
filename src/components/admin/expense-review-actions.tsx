"use client";

import { useState, useTransition } from "react";
import { approveExpense, rejectExpense } from "@/app/admin/despesas/actions";
import { buttonClass, inputClass, secondaryButtonClass } from "@/lib/ui";

export function ExpenseReviewActions({ expenseId }: { expenseId: string }) {
  const [isPending, startTransition] = useTransition();
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => approveExpense(expenseId))}
          className={`${buttonClass} min-h-11 px-3 text-sm`}
        >
          Aprovar
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => setShowReject((v) => !v)}
          className={`${secondaryButtonClass} min-h-11 px-3 text-sm`}
        >
          Rejeitar
        </button>
      </div>
      {showReject && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo"
            className={`${inputClass} min-h-11 w-full text-sm sm:w-48`}
          />
          <button
            type="button"
            disabled={isPending || !reason.trim()}
            onClick={() => startTransition(() => rejectExpense(expenseId, reason))}
            className={`${secondaryButtonClass} min-h-11 px-3 text-sm`}
          >
            Confirmar
          </button>
        </div>
      )}
    </div>
  );
}
