"use client";

import { useActionState } from "react";
import { buttonClass, inputClass, labelClass } from "@/lib/ui";

type ChangeRequestFormState = { error: string | null };
type ReservationOption = { id: string; code: string };

type ReservationRequestFormProps = {
  dedupeKey: string;
  reservations: ReservationOption[];
  action: (prevState: ChangeRequestFormState, formData: FormData) => Promise<ChangeRequestFormState>;
  reasonFieldName: "descricao" | "motivo";
  reasonLabel: string;
  submitLabel: string;
};

const initialState: ChangeRequestFormState = { error: null };

// Reaproveitado por "solicitar alteração" e "solicitar cancelamento" — os
// dois pedem a mesma coisa (reserva + texto livre), só muda o rótulo do
// campo de texto e a action de destino.
export function ReservationRequestForm({
  dedupeKey,
  reservations,
  action,
  reasonFieldName,
  reasonLabel,
  submitLabel,
}: ReservationRequestFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex w-full flex-col gap-3">
      <input type="hidden" name="dedupe_key" value={dedupeKey} />
      <div className="flex flex-col gap-1">
        <label htmlFor={`reservation_id_${reasonFieldName}`} className={labelClass}>
          Reserva *
        </label>
        <select id={`reservation_id_${reasonFieldName}`} name="reservation_id" required className={inputClass}>
          <option value="">—</option>
          {reservations.map((r) => (
            <option key={r.id} value={r.id}>
              {r.code}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`reason_${reasonFieldName}`} className={labelClass}>
          {reasonLabel} *
        </label>
        <textarea id={`reason_${reasonFieldName}`} name={reasonFieldName} required rows={3} className={inputClass} />
      </div>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Enviando…" : submitLabel}
      </button>
    </form>
  );
}
