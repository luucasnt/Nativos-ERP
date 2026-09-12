"use client";

import { useState, useTransition } from "react";
import { approveExpense, rejectExpense } from "@/app/admin/despesas/actions";
import { buttonClass, inputClass, secondaryButtonClass } from "@/lib/ui";

export function ExpenseReviewActions({ expenseId }: { expenseId: string }) {
  const [isPending, startTransition] = useTransition();
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => approveExpense(expenseId))}
          className={`${buttonClass} px-3 py-1 text-sm`}
        >
          Aprovar
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => setShowReject((v) => !v)}
          className={`${secondaryButtonClass} px-3 py-1 text-sm`}
        >
          Rejeitar
        </button>
      </div>
      {showReject && (
        <div className="flex gap-2">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo"
            className={`${inputClass} w-48 text-sm`}
          />
          <button
            type="button"
            disabled={isPending || !reason.trim()}
            onClick={() => startTransition(() => rejectExpense(expenseId, reason))}
            className={`${secondaryButtonClass} px-3 py-1 text-sm`}
          >
            Confirmar
          </button>
        </div>
      )}
    </div>
  );
}
