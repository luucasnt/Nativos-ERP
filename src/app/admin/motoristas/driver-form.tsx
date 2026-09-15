"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import type { DriverFormState } from "./actions";
import { buttonClass, inputClass, labelClass, mobileStickyActionClass, secondaryButtonClass } from "@/lib/ui";

const initialState: DriverFormState = { error: null };

type SupplierOption = { id: string; name: string };
type CommissionDefaultOption = { category_key: string; commission_percent: string };

type DriverFormProps = {
  action: (prevState: DriverFormState, formData: FormData) => Promise<DriverFormState>;
  suppliers: SupplierOption[];
  commissionDefaults: CommissionDefaultOption[];
  defaultValues?: {
    name: string;
    document: string | null;
    email: string | null;
    phone: string | null;
    owner_type: string;
    supplier_id: string | null;
    is_company_owner_driver: boolean;
    payment_type: string;
    commission: string | null;
    daily_rate: string | null;
    salario_mensal: string | null;
    portal_email: string | null;
  };
};

export function DriverForm({
  action,
  suppliers,
  commissionDefaults,
  defaultValues,
}: DriverFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [ownerType, setOwnerType] = useState(defaultValues?.owner_type ?? "proprio");
  const [paymentType, setPaymentType] = useState(defaultValues?.payment_type ?? "diaria");
  const commissionInputRef = useRef<HTMLInputElement>(null);

  function handleOwnerTypeChange(value: string) {
    setOwnerType(value);
    if (value === "terceirizado" && commissionInputRef.current && !commissionInputRef.current.value) {
      const match = commissionDefaults.find((d) => d.category_key === "terceirizado");
      if (match) {
        commissionInputRef.current.value = match.commission_percent;
      }
    }
  }

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className={labelClass}>
          Nome *
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={defaultValues?.name}
          className={inputClass}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="document" className={labelClass}>
            Documento
          </label>
          <input
            id="document"
            name="document"
            defaultValue={defaultValues?.document ?? ""}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="phone" className={labelClass}>
            Telefone
          </label>
          <input
            id="phone"
            name="phone"
            defaultValue={defaultValues?.phone ?? ""}
            className={inputClass}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className={labelClass}>
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={defaultValues?.email ?? ""}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="portal_email" className={labelClass}>
            E-mail de acesso ao portal
          </label>
          <input
            id="portal_email"
            name="portal_email"
            type="email"
            defaultValue={defaultValues?.portal_email ?? ""}
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
          onChange={(e) => handleOwnerTypeChange(e.target.value)}
          className={inputClass}
        >
          <option value="proprio">Frota própria</option>
          <option value="terceirizado">Terceirizado</option>
        </select>
      </div>

      {ownerType === "terceirizado" && (
        <div className="flex flex-col gap-3 rounded-xl border border-forest/10 p-4">
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
          <label className="flex items-center gap-2 text-sm text-forest/80">
            <input
              type="checkbox"
              name="is_company_owner_driver"
              defaultChecked={defaultValues?.is_company_owner_driver}
            />
            É o dono/responsável do fornecedor (login único para os dois papéis)
          </label>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="payment_type" className={labelClass}>
          Forma de pagamento *
        </label>
        <select
          id="payment_type"
          name="payment_type"
          value={paymentType}
          onChange={(e) => setPaymentType(e.target.value)}
          className={inputClass}
        >
          <option value="diaria">Diária</option>
          <option value="comissao">Comissão</option>
          <option value="salario_mensal">Salário mensal</option>
          <option value="mesclado">Mesclado</option>
        </select>
      </div>

      {(paymentType === "comissao" || paymentType === "mesclado") && (
        <div className="flex flex-col gap-1">
          <label htmlFor="commission" className={labelClass}>
            Comissão (%)
          </label>
          <input
            id="commission"
            name="commission"
            ref={commissionInputRef}
            inputMode="decimal"
            defaultValue={defaultValues?.commission ?? ""}
            className={inputClass}
          />
        </div>
      )}
      {(paymentType === "diaria" || paymentType === "mesclado") && (
        <div className="flex flex-col gap-1">
          <label htmlFor="daily_rate" className={labelClass}>
            Diária (R$)
          </label>
          <input
            id="daily_rate"
            name="daily_rate"
            inputMode="decimal"
            defaultValue={defaultValues?.daily_rate ?? ""}
            className={inputClass}
          />
        </div>
      )}
      {(paymentType === "salario_mensal" || paymentType === "mesclado") && (
        <div className="flex flex-col gap-1">
          <label htmlFor="salario_mensal" className={labelClass}>
            Salário mensal (R$)
          </label>
          <input
            id="salario_mensal"
            name="salario_mensal"
            inputMode="decimal"
            defaultValue={defaultValues?.salario_mensal ?? ""}
            className={inputClass}
          />
        </div>
      )}

      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <div className={`${mobileStickyActionClass} grid grid-cols-2 gap-2 sm:flex sm:flex-row`}>
        <button type="submit" disabled={pending} className={`${buttonClass} w-full sm:w-auto`}>
          {pending ? "Salvando…" : "Salvar"}
        </button>
        <Link href="/admin/motoristas" className={`${secondaryButtonClass} w-full sm:w-auto`}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
