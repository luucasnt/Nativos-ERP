"use client";

import { useState, useTransition } from "react";
import { updateChangeRequestStatus } from "@/app/admin/solicitacoes/actions";
import { buttonClass, inputClass } from "@/lib/ui";

const STATUS_OPTIONS: Array<[string, string]> = [
  ["solicitada", "Solicitada"],
  ["em_analise", "Em análise"],
  ["aprovada", "Aprovada"],
  ["rejeitada", "Rejeitada"],
  ["concluida", "Concluída"],
  ["aguardando_comprovante", "Aguardando comprovante"],
  ["comprovante_em_analise", "Comprovante em análise"],
  ["pago", "Paga"],
];

export function ChangeRequestReviewActions({ id, currentStatus }: { id: string; currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className={`${inputClass} text-sm`}
      >
        {STATUS_OPTIONS.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Resposta (opcional)"
        className={`${inputClass} text-sm`}
      />
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => updateChangeRequestStatus(id, status, note))}
        className={`${buttonClass} px-3 py-1 text-xs`}
      >
        Atualizar
      </button>
    </div>
  );
}
