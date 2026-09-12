"use client";

import { useActionState } from "react";
import { updateTaxSettings, type TaxSettingsState } from "./actions";
import { buttonClass, inputClass, labelClass } from "@/lib/ui";

const initialState: TaxSettingsState = { error: null, saved: false };

export function TaxSettingsForm({ percentual }: { percentual: number | null }) {
  const [state, formAction, pending] = useActionState(updateTaxSettings, initialState);

  return (
    <form action={formAction} className="flex max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="percentual" className={labelClass}>
          Alíquota padrão (%)
        </label>
        <input
          id="percentual"
          name="percentual"
          inputMode="decimal"
          placeholder="deixe em branco para não calcular por padrão"
          defaultValue={percentual ?? ""}
          className={inputClass}
        />
      </div>
      <p className="text-xs text-forest/50">
        Enquanto este campo estiver vazio, nenhuma reserva com nota fiscal
        calcula imposto automaticamente — a menos que você defina uma
        alíquota específica diretamente naquela reserva.
      </p>
      <div>
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Salvando…" : "Salvar"}
        </button>
      </div>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      {state.saved && <p className="text-sm text-forest">Configuração salva.</p>}
    </form>
  );
}
