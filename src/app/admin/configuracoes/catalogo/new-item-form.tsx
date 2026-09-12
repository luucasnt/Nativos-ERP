"use client";

import { useActionState } from "react";
import { createCatalogItem, type CatalogItemFormState } from "./actions";
import { buttonClass, inputClass } from "@/lib/ui";

const initialState: CatalogItemFormState = { error: null };

export function NewCatalogItemForm({ type }: { type: string }) {
  const [state, formAction, pending] = useActionState(createCatalogItem, initialState);

  return (
    <form action={formAction} className="mb-6 flex flex-wrap items-end gap-3">
      <input type="hidden" name="type" value={type} />
      <div className="flex flex-col gap-1">
        <label className="text-xs text-forest/60">Chave</label>
        <input name="key" required placeholder="ex.: sedan_executivo" className={inputClass} />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-forest/60">Rótulo</label>
        <input name="label" required placeholder="ex.: Sedan executivo" className={inputClass} />
      </div>
      <div className="flex w-20 flex-col gap-1">
        <label className="text-xs text-forest/60">Ordem</label>
        <input name="order" type="number" defaultValue={0} className={inputClass} />
      </div>
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Adicionando…" : "Adicionar"}
      </button>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
    </form>
  );
}
