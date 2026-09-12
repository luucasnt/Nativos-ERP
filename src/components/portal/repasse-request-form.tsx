"use client";

import { useActionState } from "react";
import { buttonClass, inputClass, labelClass } from "@/lib/ui";

type ChangeRequestFormState = { error: string | null };
type EntryOption = { id: string; label: string };

type RepasseRequestFormProps = {
  dedupeKey: string;
  entries: EntryOption[];
  action: (prevState: ChangeRequestFormState, formData: FormData) => Promise<ChangeRequestFormState>;
};

const initialState: ChangeRequestFormState = { error: null };

export function RepasseRequestForm({ dedupeKey, entries, action }: RepasseRequestFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-3 rounded-sm border border-forest/10 p-4">
      <input type="hidden" name="dedupe_key" value={dedupeKey} />
      {entries.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className={labelClass}>Lançamentos referentes a este pedido</span>
          <div className="flex flex-col gap-1">
            {entries.map((e) => (
              <label key={e.id} className="flex items-center gap-2 text-sm text-forest/80">
                <input type="checkbox" name="entry_ids" value={e.id} />
                {e.label}
              </label>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-col gap-1">
        <label htmlFor="nota" className={labelClass}>
          Observação
        </label>
        <textarea id="nota" name="nota" rows={3} className={inputClass} />
      </div>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Enviando…" : "Solicitar repasse"}
      </button>
    </form>
  );
}
