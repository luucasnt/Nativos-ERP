"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { buttonClass, secondaryButtonClass } from "@/lib/ui";

export function SystemErrorState({ reset, homeHref }: { reset: () => void; homeHref: string }) {
  return (
    <section className="surface-elevated mx-auto max-w-xl px-5 py-10 text-center sm:px-8 sm:py-12">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-warning-light text-warning">
        <AlertTriangle size={24} aria-hidden="true" />
      </span>
      <p className="eyebrow mt-5">Conexão interrompida</p>
      <h1 className="mt-1 text-xl font-semibold text-forest">Não foi possível carregar esta área</h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-forest/65">A conexão pode ter oscilado. Nenhuma informação foi alterada; você pode tentar novamente com segurança.</p>
      <div className="mt-6 grid gap-2 sm:flex sm:justify-center">
        <button type="button" onClick={reset} className={buttonClass}><RotateCcw size={16} aria-hidden="true" />Tentar novamente</button>
        <Link href={homeHref} className={secondaryButtonClass}>Voltar ao início</Link>
      </div>
    </section>
  );
}
