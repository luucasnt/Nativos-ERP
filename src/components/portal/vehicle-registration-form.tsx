"use client";

import { useActionState } from "react";
import { registerVehiclePortal, type VehicleRegistrationState } from "@/app/portal/empresa/actions";
import { buttonClass, inputClass, labelClass } from "@/lib/ui";

const initialState: VehicleRegistrationState = { error: null };

type CategoryOption = { id: string; label: string };

export function VehicleRegistrationForm({ categories }: { categories: CategoryOption[] }) {
  const [state, formAction, pending] = useActionState(registerVehiclePortal, initialState);

  return (
    <form action={formAction} className="flex w-full flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="plate" className={labelClass}>
            Placa *
          </label>
          <input id="plate" name="plate" required className={`${inputClass} uppercase`} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="model" className={labelClass}>
            Modelo *
          </label>
          <input id="model" name="model" required className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="category_id" className={labelClass}>
            Categoria
          </label>
          <select id="category_id" name="category_id" className={inputClass}>
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="capacity" className={labelClass}>
            Capacidade *
          </label>
          <input id="capacity" name="capacity" type="number" min={1} required className={inputClass} />
        </div>
      </div>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Enviando…" : "Cadastrar veículo"}
      </button>
      <p className="text-xs text-forest/50">
        O cadastro fica pendente até a aprovação da equipe Nativos.
      </p>
    </form>
  );
}
