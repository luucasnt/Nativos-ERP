"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, ClipboardCheck, LoaderCircle } from "lucide-react";
import { saveServiceChecklist } from "@/lib/services/service-execution";
import { buttonClass } from "@/lib/ui";

const PRE_FLIGHT = [
  ["vehicle_clean", "Veículo limpo e preparado"],
  ["fuel_checked", "Combustível conferido"],
  ["tires_checked", "Pneus e itens de segurança conferidos"],
  ["documents_ready", "OS, plaquinha e documentos disponíveis"],
  ["passenger_items_ready", "Água, snacks e itens solicitados disponíveis"],
] as const;
const COMPLETION = [
  ["passenger_embarked", "Passageiro embarcou"],
  ["service_delivered", "Serviço concluído conforme combinado"],
  ["payment_checked", "Pagamento ou pendência financeira conferida"],
] as const;

type CheckKey = (typeof PRE_FLIGHT)[number][0] | (typeof COMPLETION)[number][0];
type Checklist = Partial<Record<CheckKey, boolean>> & { notes?: string };

export function ServiceChecklist({ serviceId, phase, initialValue }: { serviceId: string; phase: "preflight" | "completion"; initialValue: Checklist | null }) {
  const items = phase === "preflight" ? PRE_FLIGHT : COMPLETION;
  const [value, setValue] = useState<Checklist>(initialValue ?? {});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const complete = items.every(([key]) => value[key]);
  return <section className="surface-panel p-4 sm:p-5">
    <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold/12 text-[#806538]"><ClipboardCheck size={18} /></span><div><h2 className="section-heading">{phase === "preflight" ? "Checklist de saída" : "Checklist de finalização"}</h2><p className="mt-1 text-xs leading-5 text-forest/58">Confirme os itens para manter o serviço rastreável.</p></div></div>
    <div className="mt-4 grid gap-2">{items.map(([key, label]) => <label key={key} className="flex min-h-11 items-center gap-3 rounded-lg border border-forest/10 px-3 text-sm text-forest/80"><input type="checkbox" checked={Boolean(value[key])} onChange={(event) => { setValue((current) => ({ ...current, [key]: event.target.checked })); setSaved(false); }} className="h-4 w-4 accent-[#233b35]" />{label}</label>)}</div>
    <label className="mt-4 grid gap-1 text-xs font-medium text-forest/70"><span>Observação ou ocorrência (opcional)</span><textarea value={value.notes ?? ""} onChange={(event) => setValue((current) => ({ ...current, notes: event.target.value }))} rows={2} className="focus-ring w-full rounded-lg border border-forest/15 bg-white px-3 py-2 text-sm text-ink" placeholder="Registre qualquer detalhe relevante…" /></label>
    <div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" disabled={pending} onClick={() => startTransition(async () => { const result = await saveServiceChecklist(serviceId, phase, value); setError(result.error); if (!result.error) setSaved(true); })} className={buttonClass}>{pending ? <LoaderCircle size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} {pending ? "Salvando…" : "Salvar checklist"}</button>{saved && <span className="text-xs font-medium text-success">Checklist salvo</span>}{!complete && <span className="text-xs text-warning">Marque todos os itens para liberar a ação.</span>}</div>
    {error && <p role="alert" className="mt-3 text-xs text-danger">{error}</p>}
  </section>;
}
