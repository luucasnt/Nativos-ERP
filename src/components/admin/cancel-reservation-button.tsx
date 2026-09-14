"use client";

import { useState, useTransition } from "react";
import { XCircle } from "lucide-react";
import { cancelReservationEntirely } from "@/app/admin/reservas/actions";
import { inputClass } from "@/lib/ui";

export function CancelReservationButton({ reservationId }: { reservationId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-danger/25 bg-white px-3 text-sm font-semibold text-danger hover:bg-danger/[0.04]"><XCircle size={16} /> Cancelar reserva</button>;
  return <div className="w-full max-w-md rounded-xl border border-danger/20 bg-danger/[0.035] p-3">
    <p className="text-sm font-semibold text-forest">Confirmar cancelamento</p><p className="mt-1 text-xs text-forest/58">Serviços e títulos ainda não pagos serão cancelados juntos. Esta ação ficará no histórico.</p>
    <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={2} placeholder="Motivo do cancelamento" className={`${inputClass} mt-3`} />
    {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" disabled={isPending} onClick={() => setOpen(false)} className="focus-ring min-h-10 rounded-lg border border-forest/15 px-3 text-sm font-medium text-forest">Voltar</button><button type="button" disabled={isPending || !reason.trim()} onClick={() => startTransition(async () => { setError(null); try { await cancelReservationEntirely(reservationId, reason); setOpen(false); } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível cancelar."); } })} className="focus-ring min-h-10 rounded-lg bg-danger px-3 text-sm font-semibold text-white disabled:opacity-50">{isPending ? "Cancelando..." : "Confirmar cancelamento"}</button></div>
  </div>;
}
