"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { updateChangeRequestStatus } from "@/app/admin/solicitacoes/actions";
import { buttonClass, inputClass } from "@/lib/ui";

const LABELS: Record<string, string> = { solicitada: "Solicitada", em_analise: "Em análise", aprovada: "Aprovada", rejeitada: "Rejeitada", concluida: "Concluída", aguardando_comprovante: "Aguardando comprovante", comprovante_em_analise: "Comprovante em análise", pago: "Paga" };
const NEXT: Record<string, string[]> = {
  solicitada: ["solicitada", "em_analise", "aprovada", "rejeitada"],
  em_analise: ["em_analise", "aprovada", "rejeitada"],
  aprovada: ["aprovada", "concluida", "aguardando_comprovante", "pago"],
  rejeitada: ["rejeitada"], concluida: ["concluida"],
  aguardando_comprovante: ["aguardando_comprovante", "comprovante_em_analise", "pago", "rejeitada"],
  comprovante_em_analise: ["comprovante_em_analise", "pago", "rejeitada", "aguardando_comprovante"],
  pago: ["pago", "concluida"],
};

export function ChangeRequestReviewActions({ id, currentStatus }: { id: string; currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const terminal = ["rejeitada", "concluida"].includes(currentStatus);

  if (terminal) return <p className="text-sm text-forest/55">Fluxo encerrado.</p>;
  return <div className="grid gap-2">
    <select value={status} onChange={(event) => setStatus(event.target.value)} disabled={isPending} className={inputClass}>
      {(NEXT[currentStatus] ?? [currentStatus]).map((value) => <option key={value} value={value}>{LABELS[value] ?? value}</option>)}
    </select>
    <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} placeholder="Resposta ao solicitante" disabled={isPending} className={inputClass} />
    <button type="button" disabled={isPending || status === currentStatus} onClick={() => startTransition(async () => { setError(null); setSuccess(false); try { await updateChangeRequestStatus(id, status, note); setSuccess(true); } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao atualizar a solicitação."); } })} className={`${buttonClass} min-h-11 w-full`}>
      {isPending ? "Atualizando..." : "Confirmar etapa"}
    </button>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    {success && <p role="status" className="flex items-center gap-1 text-sm text-success"><CheckCircle2 size={14} /> Solicitação atualizada.</p>}
  </div>;
}
