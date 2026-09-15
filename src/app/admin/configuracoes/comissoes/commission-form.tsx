"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { CommissionDefaultFormState } from "./actions";
import { buttonClass, inputClass, labelClass, secondaryButtonClass } from "@/lib/ui";

const initialState: CommissionDefaultFormState = { error: null };

const DRIVER_CATEGORIES = ["proprio", "terceirizado", "diaria", "comissao", "salario_mensal", "mesclado"];

type CommissionFormProps = {
  action: (prevState: CommissionDefaultFormState, formData: FormData) => Promise<CommissionDefaultFormState>;
  companyCategories: { key: string; label: string }[];
  defaultValues?: {
    target: "company" | "driver";
    category_key: string;
    commission_percent: string;
    active: boolean;
  };
};

export function CommissionForm({ action, companyCategories, defaultValues }: CommissionFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const isEditing = Boolean(defaultValues);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="target" className={labelClass}>
          Alvo *
        </label>
        <select
          id="target"
          name="target"
          disabled={isEditing}
          defaultValue={defaultValues?.target ?? "company"}
          className={`${inputClass} disabled:bg-forest/5`}
        >
          <option value="company">Empresa (parceiro/fornecedor)</option>
          <option value="driver">Motorista</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="category_key" className={labelClass}>
          Categoria *
        </label>
        {isEditing ? (
          <input
            id="category_key"
            name="category_key"
            disabled
            defaultValue={defaultValues?.category_key}
            className={`${inputClass} disabled:bg-forest/5`}
          />
        ) : (
          <input
            id="category_key"
            name="category_key"
            list="category-suggestions"
            required
            placeholder="ex.: hotel, terceirizado…"
            className={inputClass}
          />
        )}
        <datalist id="category-suggestions">
          {companyCategories.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
          {DRIVER_CATEGORIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="commission_percent" className={labelClass}>
          Comissão (%) *
        </label>
        <input
          id="commission_percent"
          name="commission_percent"
          required
          inputMode="decimal"
          defaultValue={defaultValues?.commission_percent}
          className={inputClass}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-forest/80">
        <input type="checkbox" name="active" defaultChecked={defaultValues?.active ?? true} />
        Ativa
      </label>

      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="submit" disabled={pending} className={`${buttonClass} w-full sm:w-auto`}>
          {pending ? "Salvando…" : "Salvar"}
        </button>
        <Link href="/admin/configuracoes/comissoes" className={`${secondaryButtonClass} w-full sm:w-auto`}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
