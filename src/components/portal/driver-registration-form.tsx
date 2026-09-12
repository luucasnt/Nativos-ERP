"use client";

import { useActionState } from "react";
import { registerDriverPortal, type DriverRegistrationState } from "@/app/portal/empresa/actions";
import { buttonClass, inputClass, labelClass } from "@/lib/ui";

const initialState: DriverRegistrationState = { error: null };

export function DriverRegistrationForm() {
  const [state, formAction, pending] = useActionState(registerDriverPortal, initialState);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-3 rounded-sm border border-forest/10 p-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className={labelClass}>
          Nome *
        </label>
        <input id="name" name="name" required className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="document" className={labelClass}>
            Documento
          </label>
          <input id="document" name="document" className={inputClass} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="phone" className={labelClass}>
            Telefone
          </label>
          <input id="phone" name="phone" className={inputClass} />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className={labelClass}>
          E-mail
        </label>
        <input id="email" name="email" type="email" className={inputClass} />
      </div>
      <label className="flex items-center gap-2 text-sm text-forest/80">
        <input type="checkbox" name="is_company_owner_driver" />
        Este motorista é o dono/responsável da empresa
      </label>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Enviando…" : "Cadastrar motorista"}
      </button>
      <p className="text-xs text-forest/50">
        O cadastro fica pendente até a aprovação da equipe Nativos.
      </p>
    </form>
  );
}
