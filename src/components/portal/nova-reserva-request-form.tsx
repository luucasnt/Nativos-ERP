"use client";

import { useActionState } from "react";
import { submitNovaReservaRequest, type ChangeRequestFormState } from "@/app/portal/empresa/actions";
import { buttonClass, inputClass, labelClass } from "@/lib/ui";

const initialState: ChangeRequestFormState = { error: null };

export function NovaReservaRequestForm({ dedupeKey }: { dedupeKey: string }) {
  const [state, formAction, pending] = useActionState(submitNovaReservaRequest, initialState);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-3 rounded-sm border border-forest/10 p-4">
      <input type="hidden" name="dedupe_key" value={dedupeKey} />
      <div className="flex flex-col gap-1">
        <label htmlFor="cliente_nome" className={labelClass}>
          Cliente *
        </label>
        <input id="cliente_nome" name="cliente_nome" required className={inputClass} />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="descricao" className={labelClass}>
          O que você precisa? *
        </label>
        <textarea id="descricao" name="descricao" required rows={3} className={inputClass} />
      </div>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Enviando…" : "Solicitar nova reserva"}
      </button>
      <p className="text-xs text-forest/50">
        A equipe Nativos analisa e monta a reserva a partir do seu pedido.
      </p>
    </form>
  );
}
