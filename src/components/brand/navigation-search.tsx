"use client";

import Link from "next/link";
import { Building2, CalendarDays, CarFront, Search, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type SearchItem = { href: string; label: string };
type EntityResult = { id: string; type: string; title: string; description: string; href: string };

const RESULT_ICONS = {
  Reserva: CalendarDays,
  Cliente: UserRound,
  Motorista: UserRound,
  Veículo: CarFront,
  Parceiro: Building2,
  Fornecedor: Building2,
} as const;

export function NavigationSearch({ items, entitySearch = false }: { items: SearchItem[]; entitySearch?: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EntityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
    else {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (!entitySearch || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/search?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Falha na busca");
        const payload = (await response.json()) as { results?: EntityResult[] };
        setResults(payload.results ?? []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [entitySearch, query]);

  const moduleResults = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    if (!normalized) return items;
    return items.filter((item) => item.label.toLocaleLowerCase("pt-BR").includes(normalized));
  }, [items, query]);

  const hasQuery = query.trim().length > 0;
  const showEntityHint = entitySearch && query.trim().length === 1;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Abrir busca do sistema" className="focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-forest/10 bg-[#faf9f6] text-forest/58 transition hover:border-forest/20 hover:bg-white xl:h-9 xl:w-full xl:max-w-[380px] xl:justify-start xl:gap-2 xl:rounded-lg xl:px-3 xl:text-sm xl:text-forest/60">
        <Search size={17} aria-hidden="true" />
        <span className="hidden flex-1 text-left xl:inline">{entitySearch ? "Buscar reserva, cliente, veículo..." : "Buscar menu ou módulo"}</span>
        <kbd className="hidden rounded border border-forest/10 bg-white px-1.5 py-0.5 text-[11px] text-forest/58 xl:inline">⌘ K</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-[110] flex items-start justify-center bg-forest-dark/42 px-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-[3px] sm:px-4 sm:pt-[12vh]">
          <button type="button" aria-label="Fechar busca" className="absolute inset-0" onClick={() => setOpen(false)} />
          <section role="dialog" aria-modal="true" aria-label="Busca do sistema" className="surface-elevated relative z-10 flex max-h-[min(720px,calc(100dvh-24px))] w-full max-w-xl flex-col overflow-hidden bg-white">
            <div className="flex shrink-0 items-center gap-3 border-b border-forest/10 px-4">
              <Search size={19} className="text-gold" aria-hidden="true" />
              <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={entitySearch ? "Reserva, cliente, placa, motorista..." : "Digite o nome do módulo..."} className="h-16 min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-forest/55" />
              <button type="button" onClick={() => setOpen(false)} aria-label="Fechar busca" className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-lg text-forest/55 hover:bg-forest/5 hover:text-forest"><X size={18} aria-hidden="true" /></button>
            </div>

            <div className="min-h-0 overflow-y-auto p-2 sm:p-3">
              {!hasQuery && <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.12em] text-forest/60">Acesso rápido</p>}
              {showEntityHint && <p className="px-3 py-7 text-center text-sm text-forest/60">Digite mais um caractere para pesquisar em toda a operação.</p>}

              {results.length > 0 && (
                <div className="mb-3">
                  <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.12em] text-forest/60">Resultados da operação</p>
                  <div className="grid gap-1">
                    {results.map((item) => {
                      const Icon = RESULT_ICONS[item.type as keyof typeof RESULT_ICONS] ?? Search;
                      return <Link key={item.id} href={item.href} onClick={() => setOpen(false)} className="focus-ring flex min-h-14 items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-forest/[0.055]">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold/12 text-[#806538]"><Icon size={17} aria-hidden="true" /></span>
                        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-forest">{item.title}</span><span className="mt-0.5 block truncate text-xs text-forest/60">{item.type} · {item.description}</span></span>
                      </Link>;
                    })}
                  </div>
                </div>
              )}

              {moduleResults.length > 0 && (!hasQuery || results.length === 0) && <div>
                {hasQuery && <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.12em] text-forest/60">Módulos</p>}
                <div className="grid gap-1 sm:grid-cols-2">{moduleResults.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="focus-ring flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-forest transition hover:bg-forest/[0.055]">{item.label}</Link>)}</div>
              </div>}

              {loading && <div className="px-3 py-8 text-center text-sm text-forest/58">Buscando na operação...</div>}
              {!loading && hasQuery && !showEntityHint && results.length === 0 && moduleResults.length === 0 && <div className="px-3 py-10 text-center"><p className="text-sm font-semibold text-forest">Nenhum resultado encontrado</p><p className="mt-1 text-xs text-forest/58">Confira o termo ou tente nome, código, telefone ou placa.</p></div>}
            </div>
            <footer className="hidden shrink-0 items-center justify-between border-t border-forest/10 bg-[#faf9f6] px-4 py-2.5 text-[11px] text-forest/60 sm:flex"><span>Busca segura conforme seu perfil de acesso</span><span>ESC para fechar</span></footer>
          </section>
        </div>
      )}
    </>
  );
}
