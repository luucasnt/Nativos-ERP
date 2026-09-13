"use client";

import { useActionState } from "react";
import { submitServiceExpense, type ExpenseFormState } from "@/app/portal/motorista/actions";
import { buttonClass, inputClass, labelClass } from "@/lib/ui";

const initialState: ExpenseFormState = { error: null };

type ServiceOption = { id: string; label: string };
type CategoryOption = { id: string; label: string };

export function ExpenseForm({
  services,
  categories,
}: {
  services: ServiceOption[];
  categories: CategoryOption[];
}) {
  const [state, formAction, pending] = useActionState(submitServiceExpense, initialState);

  return (
    <form action={formAction} className="flex w-full flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="service_id" className={labelClass}>
          Serviço *
        </label>
        <select id="service_id" name="service_id" required className={inputClass}>
          <option value="">—</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
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
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Enviando…" : "Registrar despesa"}
      </button>
    </form>
  );
}
