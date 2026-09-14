"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { VehicleFormState } from "./actions";
import { buttonClass, inputClass, labelClass, secondaryButtonClass } from "@/lib/ui";

const initialState: VehicleFormState = { error: null };

type CategoryOption = { id: string; label: string };
type SupplierOption = { id: string; name: string };

type VehicleFormProps = {
  action: (prevState: VehicleFormState, formData: FormData) => Promise<VehicleFormState>;
  categories: CategoryOption[];
  suppliers: SupplierOption[];
  defaultValues?: {
    plate: string;
    model: string;
    category_id: string | null;
    capacity: number;
    owner_type: string;
    supplier_id: string | null;
    status: string;
    initial_odometer_km: number | null;
  };
};

export function VehicleForm({ action, categories, suppliers, defaultValues }: VehicleFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [ownerType, setOwnerType] = useState(defaultValues?.owner_type ?? "proprio");

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="plate" className={labelClass}>
            Placa *
          </label>
          <input
            id="plate"
            name="plate"
            required
            defaultValue={defaultValues?.plate}
            className={`${inputClass} uppercase`}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="model" className={labelClass}>
            Modelo *
          </label>
          <input
            id="model"
            name="model"
            required
            defaultValue={defaultValues?.model}
            className={inputClass}
          />
        </div>
      </div>
      {ownerType === "proprio" && (
        <div className="flex flex-col gap-1">
          <label htmlFor="initial_odometer_km" className={labelClass}>KM atual no cadastro *</label>
          <input id="initial_odometer_km" name="initial_odometer_km" type="number" min="0" step="1" required inputMode="numeric" defaultValue={defaultValues?.initial_odometer_km ?? ""} className={inputClass} placeholder="Ex.: 48.100" />
          <p className="text-[11px] text-forest/45">Será a base para o cálculo de consumo nos próximos abastecimentos.</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="category_id" className={labelClass}>
            Categoria
          </label>
          <select
            id="category_id"
            name="category_id"
            defaultValue={defaultValues?.category_id ?? ""}
            className={inputClass}
          >
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
            Capacidade (passageiros) *
          </label>
          <input
            id="capacity"
            name="capacity"
            type="number"
            min={1}
            required
            defaultValue={defaultValues?.capacity}
            className={inputClass}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="owner_type" className={labelClass}>
          Tipo *
        </label>
        <select
          id="owner_type"
          name="owner_type"
          value={ownerType}
          onChange={(e) => setOwnerType(e.target.value)}
          className={inputClass}
        >
          <option value="proprio">Frota própria</option>
          <option value="terceirizado">Terceirizado</option>
        </select>
      </div>
      {ownerType === "terceirizado" && (
        <div className="flex flex-col gap-1">
          <label htmlFor="supplier_id" className={labelClass}>
            Fornecedor *
          </label>
          <select
            id="supplier_id"
            name="supplier_id"
            defaultValue={defaultValues?.supplier_id ?? ""}
            className={inputClass}
          >
            <option value="">—</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="flex flex-col gap-1">
        <label htmlFor="status" className={labelClass}>
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={defaultValues?.status ?? "ativo"}
          className={inputClass}
        >
          <option value="ativo">Ativo</option>
          <option value="manutencao">Em manutenção</option>
          <option value="inativo">Inativo</option>
        </select>
      </div>

      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Salvando…" : "Salvar"}
        </button>
        <Link href="/admin/veiculos" className={secondaryButtonClass}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
