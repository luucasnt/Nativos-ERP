"use client";
import { useEffect, useRef, useState } from "react";
import { ServiceChecklist, type Checklist } from "./service-checklist";
import { completeService, startService } from "@/lib/services/service-execution";
import { CheckCircle2, Play } from "lucide-react";
import { buttonClass, secondaryButtonClass } from "@/lib/ui";
export function ServiceExecutionActions({ serviceId, executionStatus, preflightChecklist = null, completionChecklist = null }: { serviceId: string; executionStatus: string; preflightChecklist?: Checklist | null; completionChecklist?: Checklist | null }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close(); }, [open]);
  if (!["agendado", "em_andamento"].includes(executionStatus)) return null;
  const starting = executionStatus === "agendado";
  return <div className="grid w-full gap-1 sm:w-auto">
    <button type="button" onClick={() => setOpen(true)} className={`${starting ? buttonClass : secondaryButtonClass} min-h-12 w-full px-5 text-sm sm:w-auto`}>{starting ? <Play size={16} aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}{starting ? "Iniciar serviço" : "Finalizar serviço"}</button>
    <dialog ref={dialog} onCancel={() => setOpen(false)} onClose={() => setOpen(false)} aria-label="Conferência do serviço" className="m-auto max-h-[90dvh] w-[calc(100%-24px)] max-w-lg overflow-y-auto rounded-xl bg-white p-3 backdrop:bg-black/40">
      <button type="button" onClick={() => setOpen(false)} className={`${secondaryButtonClass} mb-3`}>Voltar</button>
      {open && <ServiceChecklist key={executionStatus} serviceId={serviceId} phase={starting ? "preflight" : "completion"} initialValue={starting ? preflightChecklist : completionChecklist} actionLabel={starting ? "Salvar e iniciar serviço" : "Salvar e finalizar serviço"} onSaved={async () => { const result = await (starting ? startService(serviceId) : completeService(serviceId)); if (!result.error) setOpen(false); return result; }} />}
    </dialog>
  </div>;
}
