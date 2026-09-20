"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { inputClass } from "@/lib/ui";

type Option = { id: string; name: string };
type Entity = "client" | "partner" | "company" | "driver" | "vehicle";

export function SearchableEntitySelect({ name, label, entity, value = "", initialOptions = [], required = false }: { name: string; label: string; entity: Entity; value?: string; initialOptions?: Option[]; required?: boolean }) {
  const selected = initialOptions.find((option) => option.id === value);
  const [query, setQuery] = useState(selected?.name ?? "");
  const [options, setOptions] = useState<Option[]>(initialOptions);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(value);
  const [loading, setLoading] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close); return () => document.removeEventListener("mousedown", close);
  }, []);
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2 || term === selected?.name) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try { const response = await fetch(`/api/admin/search?entity=${entity}&q=${encodeURIComponent(term)}`, { signal: controller.signal }); const data = await response.json() as { results?: Array<{ value?: string; title: string }> }; setOptions((data.results ?? []).map((item) => ({ id: item.value ?? "", name: item.title })).filter((item) => item.id)); } catch { /* request cancelled */ } finally { setLoading(false); }
    }, 220);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, entity, selected?.name]);

  return <div ref={root} className="relative grid gap-1"><label className="text-xs font-medium text-forest/75">{label}{required ? " *" : ""}</label><div className="relative"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-forest/35" /><input value={query} onChange={(event) => { setQuery(event.target.value); setSelectedId(""); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Digite para pesquisar…" className={`${inputClass} pl-9 pr-9`} aria-label={label} /><ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-forest/35" /></div><input type="hidden" name={name} value={selectedId} required={required} />{open && (query.trim().length >= 2 || options.length > 0) && <div className="surface-elevated absolute inset-x-0 top-[calc(100%+6px)] z-30 max-h-64 overflow-y-auto bg-white p-1">{loading && <p className="px-3 py-2 text-sm text-forest/55">Pesquisando…</p>}{!loading && options.length === 0 && <p className="px-3 py-2 text-sm text-forest/55">Nenhum resultado.</p>}{!loading && options.map((option) => <button key={option.id} type="button" onClick={() => { setSelectedId(option.id); setQuery(option.name); setOpen(false); }} className="flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-left text-sm text-forest hover:bg-forest/[0.05]"><span className="truncate">{option.name}</span>{option.id === selectedId && <Check size={16} className="shrink-0 text-gold" />}</button>)}</div>}</div>;
}
