"use client";

import { useActionState } from "react";
import { submitServiceExpense, type ExpenseFormState } from "@/app/portal/motorista/actions";
import { buttonClass, inputClass, labelClass } from "@/lib/ui";

const initialState: ExpenseFormState = { error: null };

type ServiceOption = { id: string; label: string };
type CategoryOption = { id: string; label: string };
type VehicleOption = { id: string; label: string };

export function ExpenseForm({
  services,
  categories,
  dedupeKey,
  vehicles,
}: {
  services: ServiceOption[];
  categories: CategoryOption[];
  dedupeKey: string;
  vehicles: VehicleOption[];
}) {
  const [state, formAction, pending] = useActionState(submitServiceExpense, initialState);

  return (
    <form action={formAction} className="flex w-full flex-col gap-3">
      <input type="hidden" name="dedupe_key" value={dedupeKey} />
      <div className="flex flex-col gap-1">
        <label htmlFor="service_id" className={labelClass}>
          Serviço *
        </label>
        <select id="service_id" name="service_id" className={inputClass}>
          <option value="">Despesa avulsa, sem reserva</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="vehicle_id" className={labelClass}>Veículo</label>
        <select id="vehicle_id" name="vehicle_id" className={inputClass}>
          <option value="">Despesa do motorista, sem veículo</option>
          {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.label}</option>)}
        </select>
        <p className="text-[11px] text-forest/45">Obrigatório para abastecimento, lavagem e manutenção. Alimentação e outras despesas do motorista podem ficar sem veículo.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="odometer_km" className={labelClass}>KM atual do veículo {"(obrigatório no abastecimento)"}</label>
          <input id="odometer_km" name="odometer_km" type="number" min="0" step="1" inputMode="numeric" className={inputClass} placeholder="Ex.: 48.520" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="quantity" className={labelClass}>Litros / quantidade</label>
          <input id="quantity" name="quantity" type="number" min="0" step="0.001" inputMode="decimal" className={inputClass} placeholder="Ex.: 42,5" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="unit_price" className={labelClass}>Preço por litro / unidade</label>
          <input id="unit_price" name="unit_price" type="number" min="0" step="0.001" inputMode="decimal" className={inputClass} placeholder="Ex.: 6,19" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="fuel_type" className={labelClass}>Combustível</label>
          <select id="fuel_type" name="fuel_type" className={inputClass}>
            <option value="">Não se aplica</option><option value="gasolina">Gasolina</option><option value="etanol">Etanol</option><option value="diesel">Diesel</option><option value="gnv">GNV</option>
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="category_id" className={labelClass}>
          Categoria *
        </label>
        <select id="category_id" name="category_id" required className={inputClass}>
          <option value="">—</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="amount" className={labelClass}>
          Valor (R$) *
        </label>
        <input id="amount" name="amount" inputMode="decimal" required className={inputClass} />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="receipt_url" className={labelClass}>
          Link do comprovante
        </label>
        <input id="receipt_url" name="receipt_url" type="url" className={inputClass} />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="invoice_number" className={labelClass}>Nº da nota fiscal</label>
        <input id="invoice_number" name="invoice_number" className={inputClass} placeholder="Opcional" />
      </div>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Enviando…" : "Registrar despesa"}
      </button>
    </form>
  );
}
