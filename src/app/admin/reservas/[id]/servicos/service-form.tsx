"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { ServiceFormState } from "./actions";
import { buttonClass, inputClass, labelClass, mobileStickyActionClass, secondaryButtonClass } from "@/lib/ui";

const initialState: ServiceFormState = { error: null };

type Option = { id: string; name: string };
type CatalogOption = { id: string; label: string };

type ServiceFormProps = {
  action: (prevState: ServiceFormState, formData: FormData) => Promise<ServiceFormState>;
  suppliers: Option[];
  drivers: Option[];
  vehicles: Option[];
  disposicaoPackages: CatalogOption[];
  cancelHref: string;
  isEditing?: boolean;
  defaultValues?: {
    type: string;
    execution_type: string;
    supplier_id: string | null;
    driver_id: string | null;
    vehicle_id: string | null;
    scheduled_date: string | null;
    scheduled_time: string | null;
    pickup_location: string | null;
    dropoff_location: string | null;
    passenger_count: number | null;
    flight_number: string | null;
    notes: string | null;
    pacote_disposicao_id: string | null;
    km_incluido: string | null;
    valor_hora_extra: string | null;
    valor_km_extra: string | null;
    original_price: string;
    supplier_cost: string | null;
    discount_type: string;
    discount_value: string | null;
    discount_reason: string | null;
    luggage_10kg: number;
    luggage_23kg: number;
    luggage_32kg: number;
    bebe_conforto: number;
    cadeirinha: number;
    booster: number;
    driver_can_receive_payment: boolean;
    reception_sign_enabled: boolean;
    reception_passenger_name: string | null;
    os_show_price: boolean | null;
  };
};

export function ServiceForm({
  action,
  suppliers,
  drivers,
  vehicles,
  disposicaoPackages,
  cancelHref,
  isEditing,
  defaultValues,
}: ServiceFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [type, setType] = useState(defaultValues?.type ?? "transfer_chegada");
  const [executionType, setExecutionType] = useState(defaultValues?.execution_type ?? "propria");
  const [discountType, setDiscountType] = useState(defaultValues?.discount_type ?? "nenhum");

  const osShowPriceDefault =
    defaultValues?.os_show_price === null || defaultValues?.os_show_price === undefined
      ? "herda"
      : defaultValues.os_show_price
        ? "sim"
        : "nao";

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="type" className={labelClass}>
            Tipo *
          </label>
          <select
            id="type"
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className={inputClass}
          >
            <option value="transfer_chegada">Transfer chegada</option>
            <option value="transfer_saida">Transfer saída</option>
            <option value="transfer_interno">Transfer interno</option>
            <option value="disposicao">Disposição</option>
            <option value="passeio">Passeio</option>
            <option value="concierge">Concierge</option>
            <option value="carrinho_golfe">Carrinho de golfe</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="execution_type" className={labelClass}>
            Execução *
          </label>
          <select
            id="execution_type"
            name="execution_type"
            value={executionType}
            onChange={(e) => setExecutionType(e.target.value)}
            className={inputClass}
          >
            <option value="propria">Frota própria</option>
            <option value="fornecedor">Fornecedor</option>
          </select>
        </div>
      </div>

      {executionType === "fornecedor" && (
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="driver_id" className={labelClass}>
            Motorista
          </label>
          <select
            id="driver_id"
            name="driver_id"
            defaultValue={defaultValues?.driver_id ?? ""}
            className={inputClass}
          >
            <option value="">—</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="vehicle_id" className={labelClass}>
            Veículo
          </label>
          <select
            id="vehicle_id"
            name="vehicle_id"
            defaultValue={defaultValues?.vehicle_id ?? ""}
            className={inputClass}
          >
            <option value="">—</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="flex flex-col gap-4 rounded-xl border border-forest/10 p-4">
        <legend className="font-serif text-lg text-forest">Agenda</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="scheduled_date" className={labelClass}>
              Data
            </label>
            <input
              id="scheduled_date"
              name="scheduled_date"
              type="date"
              defaultValue={defaultValues?.scheduled_date ?? ""}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="scheduled_time" className={labelClass}>
              Hora
            </label>
            <input
              id="scheduled_time"
              name="scheduled_time"
              type="time"
              defaultValue={defaultValues?.scheduled_time ?? ""}
              className={inputClass}
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="pickup_location" className={labelClass}>
              Local de origem
            </label>
            <input
              id="pickup_location"
              name="pickup_location"
              defaultValue={defaultValues?.pickup_location ?? ""}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="dropoff_location" className={labelClass}>
              Local de destino
            </label>
            <input
              id="dropoff_location"
              name="dropoff_location"
              defaultValue={defaultValues?.dropoff_location ?? ""}
              className={inputClass}
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="passenger_count" className={labelClass}>
              Passageiros
            </label>
            <input
              id="passenger_count"
              name="passenger_count"
              type="number"
              min={0}
              defaultValue={defaultValues?.passenger_count ?? ""}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="flight_number" className={labelClass}>
              Número do voo
            </label>
            <input
              id="flight_number"
              name="flight_number"
              defaultValue={defaultValues?.flight_number ?? ""}
              className={inputClass}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="notes" className={labelClass}>
            Observações
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={defaultValues?.notes ?? ""}
            className={inputClass}
          />
        </div>
      </fieldset>

      {type === "disposicao" && (
        <fieldset className="flex flex-col gap-4 rounded-xl border border-forest/10 p-4">
          <legend className="font-serif text-lg text-forest">Disposição</legend>
          <div className="flex flex-col gap-1">
            <label htmlFor="pacote_disposicao_id" className={labelClass}>
              Pacote
            </label>
            <select
              id="pacote_disposicao_id"
              name="pacote_disposicao_id"
              defaultValue={defaultValues?.pacote_disposicao_id ?? ""}
              className={inputClass}
            >
              <option value="">—</option>
              {disposicaoPackages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="km_incluido" className={labelClass}>
                Km incluído
              </label>
              <input
                id="km_incluido"
                name="km_incluido"
                inputMode="decimal"
                defaultValue={defaultValues?.km_incluido ?? ""}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="valor_hora_extra" className={labelClass}>
                Valor hora extra
              </label>
              <input
                id="valor_hora_extra"
                name="valor_hora_extra"
                inputMode="decimal"
                defaultValue={defaultValues?.valor_hora_extra ?? ""}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="valor_km_extra" className={labelClass}>
                Valor km extra
              </label>
              <input
                id="valor_km_extra"
                name="valor_km_extra"
                inputMode="decimal"
                defaultValue={defaultValues?.valor_km_extra ?? ""}
                className={inputClass}
              />
            </div>
          </div>
        </fieldset>
      )}

      <fieldset className="flex flex-col gap-4 rounded-xl border border-forest/10 p-4">
        <legend className="font-serif text-lg text-forest">Preço</legend>
        {isEditing ? (
          <p className="text-sm text-forest/60">
            Valor original: <strong>R$ {defaultValues?.original_price}</strong>{" "}
            (não pode ser editado depois de definido — use o desconto abaixo)
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            <label htmlFor="original_price" className={labelClass}>
              Valor do serviço (R$) *
            </label>
            <input
              id="original_price"
              name="original_price"
              required
              inputMode="decimal"
              className={inputClass}
            />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="discount_type" className={labelClass}>
              Desconto
            </label>
            <select
              id="discount_type"
              name="discount_type"
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value)}
              className={inputClass}
            >
              <option value="nenhum">Nenhum</option>
              <option value="percentual">Percentual</option>
              <option value="fixo">Valor fixo</option>
            </select>
          </div>
          {discountType !== "nenhum" && (
            <div className="flex flex-col gap-1">
              <label htmlFor="discount_value" className={labelClass}>
                {discountType === "percentual" ? "Percentual (%)" : "Valor (R$)"}
              </label>
              <input
                id="discount_value"
                name="discount_value"
                inputMode="decimal"
                defaultValue={defaultValues?.discount_value ?? ""}
                className={inputClass}
              />
            </div>
          )}
        </div>
        {discountType !== "nenhum" && (
          <div className="flex flex-col gap-1">
            <label htmlFor="discount_reason" className={labelClass}>
              Motivo do desconto
            </label>
            <input
              id="discount_reason"
              name="discount_reason"
              defaultValue={defaultValues?.discount_reason ?? ""}
              className={inputClass}
            />
          </div>
        )}
        <p className="text-xs text-forest/62">
          O desconto nunca altera o custo pago ao fornecedor — a margem da
          Nativos absorve o desconto integralmente.
        </p>

        {executionType === "fornecedor" && (
          <div className="flex flex-col gap-1">
            <label htmlFor="supplier_cost" className={labelClass}>
              Custo do fornecedor (R$)
            </label>
            <input
              id="supplier_cost"
              name="supplier_cost"
              inputMode="decimal"
              defaultValue={defaultValues?.supplier_cost ?? ""}
              className={inputClass}
            />
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="os_show_price" className={labelClass}>
            Valor na ordem de serviço do motorista
          </label>
          <select
            id="os_show_price"
            name="os_show_price"
            defaultValue={osShowPriceDefault}
            className={inputClass}
          >
            <option value="herda">Usar padrão global</option>
            <option value="sim">Exibir</option>
            <option value="nao">Ocultar</option>
          </select>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4 rounded-xl border border-forest/10 p-4">
        <legend className="font-serif text-lg text-forest">Bagagem e cadeirinha</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="luggage_10kg" className={labelClass}>
              Mala até 10kg
            </label>
            <input
              id="luggage_10kg"
              name="luggage_10kg"
              type="number"
              min={0}
              defaultValue={defaultValues?.luggage_10kg ?? 0}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="luggage_23kg" className={labelClass}>
              Mala até 23kg
            </label>
            <input
              id="luggage_23kg"
              name="luggage_23kg"
              type="number"
              min={0}
              defaultValue={defaultValues?.luggage_23kg ?? 0}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="luggage_32kg" className={labelClass}>
              Mala até 32kg
            </label>
            <input
              id="luggage_32kg"
              name="luggage_32kg"
              type="number"
              min={0}
              defaultValue={defaultValues?.luggage_32kg ?? 0}
              className={inputClass}
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="bebe_conforto" className={labelClass}>
              Bebê conforto
            </label>
            <input
              id="bebe_conforto"
              name="bebe_conforto"
              type="number"
              min={0}
              defaultValue={defaultValues?.bebe_conforto ?? 0}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="cadeirinha" className={labelClass}>
              Cadeirinha
            </label>
            <input
              id="cadeirinha"
              name="cadeirinha"
              type="number"
              min={0}
              defaultValue={defaultValues?.cadeirinha ?? 0}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="booster" className={labelClass}>
              Booster
            </label>
            <input
              id="booster"
              name="booster"
              type="number"
              min={0}
              defaultValue={defaultValues?.booster ?? 0}
              className={inputClass}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3 rounded-xl border border-forest/10 p-4">
        <legend className="font-serif text-lg text-forest">Outras opções</legend>
        <label className="flex items-center gap-2 text-sm text-forest/80">
          <input
            type="checkbox"
            name="driver_can_receive_payment"
            defaultChecked={defaultValues?.driver_can_receive_payment}
          />
          Motorista/fornecedor pode receber pagamento direto do passageiro
        </label>
        <PlaquinhaFields defaultValues={defaultValues} />
      </fieldset>

      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <div className={`${mobileStickyActionClass} grid grid-cols-2 gap-2 sm:flex sm:flex-row`}>
        <button type="submit" disabled={pending} className={`${buttonClass} w-full sm:w-auto`}>
          {pending ? "Salvando…" : "Salvar"}
        </button>
        <Link href={cancelHref} className={`${secondaryButtonClass} w-full sm:w-auto`}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}

function PlaquinhaFields({
  defaultValues,
}: {
  defaultValues?: { reception_sign_enabled: boolean; reception_passenger_name: string | null };
}) {
  const [enabled, setEnabled] = useState(defaultValues?.reception_sign_enabled ?? false);

  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2 text-sm text-forest/80">
        <input
          type="checkbox"
          name="reception_sign_enabled"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        Gerar plaquinha de recepção
      </label>
      {enabled && (
        <input
          name="reception_passenger_name"
          placeholder="Nome do passageiro na plaquinha"
          defaultValue={defaultValues?.reception_passenger_name ?? ""}
          className={inputClass}
        />
      )}
    </div>
  );
}
