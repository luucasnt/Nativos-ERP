"use client";

import Link from "next/link";
import { Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type SearchItem = {
  href: string;
  label: string;
};

export function NavigationSearch({ items }: { items: SearchItem[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setQuery("");
    }
  }, [open]);

  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    if (!normalized) return items;
    return items.filter((item) => item.label.toLocaleLowerCase("pt-BR").includes(normalized));
  }, [items, query]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="focus-ring hidden h-9 w-full max-w-[360px] items-center gap-2 rounded-lg border border-forest/10 bg-[#faf9f6] px-3 text-sm text-forest/43 transition hover:border-forest/20 hover:bg-white lg:flex"
      >
        <Search size={15} aria-hidden="true" />
        <span className="flex-1 text-left">Buscar menu ou módulo</span>
        <kbd className="rounded border border-forest/10 bg-white px-1.5 py-0.5 text-[10px] text-forest/38">
          ⌘ K
        </kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-start justify-center bg-forest-dark/30 px-4 pt-[14vh] backdrop-blur-[2px]">
          <button
            type="button"
            aria-label="Fechar busca"
            className="absolute inset-0"
            onClick={() => setOpen(false)}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Busca de navegação"
            className="surface-panel relative z-10 w-full max-w-lg overflow-hidden bg-white shadow-[0_22px_70px_rgba(23,41,35,0.20)]"
          >
            <div className="flex items-center gap-3 border-b border-forest/10 px-4">
              <Search size={18} className="text-forest/45" aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Digite o nome do módulo..."
                className="h-14 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar busca"
                className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-lg text-forest/45 hover:bg-forest/5 hover:text-forest"
              >
                <X size={17} aria-hidden="true" />
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto p-2">
              {results.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-forest/50">Nenhum módulo encontrado.</p>
              ) : (
                results.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="focus-ring flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-forest transition hover:bg-forest/[0.055]"
                  >
                    {item.label}
                  </Link>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

