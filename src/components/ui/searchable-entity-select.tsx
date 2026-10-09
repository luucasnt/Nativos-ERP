"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { inputClass, labelClass } from "@/lib/ui";

type Option = { id: string; name: string };
type Entity = "client" | "partner" | "company" | "driver" | "vehicle";

type Props = {
  name: string;
  label: string;
  entity: Entity;
  value?: string;
  initialOptions?: Option[];
  required?: boolean;
};

export function SearchableEntitySelect({ name, label, entity, value = "", initialOptions = [], required = false }: Props) {
  const inputId = useId();
  const listId = `${inputId}-results`;
  const selected = initialOptions.find((option) => option.id === value);
  const [query, setQuery] = useState(selected?.name ?? "");
  const [options, setOptions] = useState<Option[]>(initialOptions);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(value);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [retry, setRetry] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    input.current?.setCustomValidity(required && !selectedId ? "Selecione um cadastro na lista de resultados." : "");
  }, [required, selectedId]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      let errorMessage = "Não foi possível pesquisar. Tente novamente.";
      try {
        const response = await fetch(`/api/admin/search?entity=${entity}&q=${encodeURIComponent(query.trim())}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (response.redirected || response.status === 401) {
          errorMessage = "Sua sessão expirou. Entre novamente para pesquisar.";
          throw new Error(errorMessage);
        }
        if (!response.ok) throw new Error(errorMessage);
        const data = await response.json() as { results?: Array<{ value?: string; title: string }> };
        if (!Array.isArray(data.results)) throw new Error("Não foi possível pesquisar. Tente novamente.");
        if (!controller.signal.aborted) {
          setOptions(data.results.filter((item) => item.value).map((item) => ({ id: item.value!, name: item.title })));
          setActiveIndex(-1);
        }
      } catch {
        if (!controller.signal.aborted) {
          setOptions([]);
          setError(errorMessage);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 220);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, entity, open, retry]);

  function select(option: Option) {
    setSelectedId(option.id);
    setQuery(option.name);
    setOpen(false);
    setError(null);
    setLoading(false);
    setActiveIndex(-1);
  }

  function showOptions() {
    if (!open) {
      setOpen(true);
      setLoading(true);
      setError(null);
    }
  }

  return (
    <div ref={root} className="relative grid gap-1" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
    }}>
      <label htmlFor={inputId} className={labelClass}>{label}{required ? " *" : ""}</label>
      <div className="relative">
        <Search size={15} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-forest/35" />
        <input
          ref={input}
          id={inputId}
          value={query}
          required={required}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelectedId("");
            setOpen(true);
            setLoading(true);
            setError(null);
            setActiveIndex(-1);
          }}
          onFocus={showOptions}
          onClick={showOptions}
          onKeyDown={(event) => {
            if (event.key === "Escape") { event.preventDefault(); setOpen(false); }
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              showOptions();
              if (!loading && options.length) setActiveIndex((index) => event.key === "ArrowDown"
                ? (index + 1) % options.length
                : (index <= 0 ? options.length : index) - 1);
            }
            if (event.key === "Enter" && open) {
              event.preventDefault();
              if (!loading && !error && activeIndex >= 0 && options[activeIndex]) select(options[activeIndex]);
            }
          }}
          placeholder="Digite para pesquisar…"
          className={`${inputClass} pl-9 pr-9`}
        />
        <ChevronDown size={16} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-forest/35" />
      </div>
      <input type="hidden" name={name} value={selectedId} />
      {open && <div className="surface-elevated absolute inset-x-0 top-[calc(100%+6px)] z-30 max-h-64 overflow-y-auto bg-white p-1">
        {loading ? <p role="status" className="px-3 py-2 text-sm text-forest/55">Pesquisando…</p> : error ? <div role="alert" className="px-3 py-2 text-sm text-red-700">
          <p>{error}</p>
          <button type="button" onClick={() => { setLoading(true); setRetry((current) => current + 1); }} className="mt-2 underline">Tentar novamente</button>
        </div> : options.length === 0 ? <p role="status" className="px-3 py-2 text-sm text-forest/55">Nenhum cadastro encontrado. Confira o termo ou cadastre antes de selecionar.</p> : null}
        <div id={listId} role="listbox" aria-label={label}>
          {!loading && !error && options.map((option, index) => <button
            key={option.id}
            id={`${listId}-${index}`}
            type="button"
            role="option"
            aria-selected={option.id === selectedId}
            tabIndex={-1}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => select(option)}
            className={`flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-left text-sm text-forest hover:bg-forest/[0.05] ${index === activeIndex ? "bg-forest/[0.05]" : ""}`}
          ><span className="truncate">{option.name}</span>{option.id === selectedId && <Check size={16} aria-hidden="true" className="shrink-0 text-gold" />}</button>)}
        </div>
      </div>}
    </div>
  );
}
