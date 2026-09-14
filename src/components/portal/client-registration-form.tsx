"use client";

import { useActionState } from "react";
import { registerClientPortal, type ChangeRequestFormState } from "@/app/portal/empresa/actions";
import { buttonClass, inputClass, labelClass } from "@/lib/ui";

const initialState: ChangeRequestFormState = { error: null };

export function ClientRegistrationForm() {
  const [state, formAction, pending] = useActionState(registerClientPortal, initialState);
  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1 sm:col-span-2"><label className={labelClass} htmlFor="client-name">Nome completo *</label><input id="client-name" name="name" required className={inputClass} /></div>
      <div className="flex flex-col gap-1"><label className={labelClass} htmlFor="client-document">CPF/CNPJ</label><input id="client-document" name="document" className={inputClass} /></div>
      <div className="flex flex-col gap-1"><label className={labelClass} htmlFor="client-phone">Telefone</label><input id="client-phone" name="phone" className={inputClass} /></div>
      <div className="flex flex-col gap-1 sm:col-span-2"><label className={labelClass} htmlFor="client-email">E-mail</label><input id="client-email" name="email" type="email" className={inputClass} /></div>
      {state.error && <p role="status" className={`text-sm sm:col-span-2 ${state.error.includes("sucesso") ? "text-green-700" : "text-red-700"}`}>{state.error}</p>}
      <button type="submit" disabled={pending} className={`${buttonClass} sm:col-span-2`}>{pending ? "Salvando…" : "Cadastrar cliente"}</button>
    </form>
  );
}
