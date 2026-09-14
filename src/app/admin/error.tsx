"use client";

import { AlertTriangle } from "lucide-react";
import { buttonClass } from "@/lib/ui";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section className="surface-panel mx-auto max-w-xl px-6 py-12 text-center"><AlertTriangle className="mx-auto text-warning" size={36} /><h1 className="mt-4 text-xl font-semibold text-forest">Não foi possível carregar esta área</h1><p className="mt-2 text-sm text-forest/60">A conexão pode ter oscilado. Seus dados não foram alterados.</p><button type="button" onClick={reset} className={`${buttonClass} mt-5`}>Tentar novamente</button></section>;
}
