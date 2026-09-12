"use client";

import { useActionState } from "react";
import { createInternalUserAction, type InternalUserFormState } from "./actions";
import { buttonClass, inputClass, labelClass } from "@/lib/ui";

const initialState: InternalUserFormState = { error: null, temporaryPassword: null, email: null };

export function NewInternalUserForm({ actorIsOwner }: { actorIsOwner: boolean }) {
  const [state, formAction, pending] = useActionState(createInternalUserAction, initialState);

  return (
    <form action={formAction} className="mb-8 flex max-w-lg flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className={labelClass}>
          E-mail *
        </label>
        <input id="email" name="email" type="email" required className={inputClass} />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="native_name" className={labelClass}>
          Nome
        </label>
        <input id="native_name" name="native_name" className={inputClass} />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="internal_role" className={labelClass}>
          Perfil *
        </label>
        <select id="internal_role" name="internal_role" className={inputClass}>
          <option value="operacional">Operacional</option>
          <option value="financeiro">Financeiro</option>
        </select>
      </div>
      {actorIsOwner && (
        <label className="flex items-center gap-2 text-sm text-forest/80">
          <input type="checkbox" name="is_owner" />
          Proprietário (controle total do sistema)
        </label>
      )}
      <div>
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Criando…" : "Criar acesso"}
        </button>
      </div>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      {state.temporaryPassword && (
        <p className="rounded-sm bg-gold/10 p-3 text-sm text-forest">
          Login criado: <strong>{state.email}</strong> — senha temporária
          (mostrada apenas uma vez):{" "}
          <strong className="font-mono">{state.temporaryPassword}</strong>
        </p>
      )}
    </form>
  );
}
