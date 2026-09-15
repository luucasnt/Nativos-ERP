"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { ClientFormState } from "./actions";
import { buttonClass, inputClass, labelClass, mobileStickyActionClass, secondaryButtonClass } from "@/lib/ui";

const initialState: ClientFormState = { error: null };

type Partner = { id: string; name: string };

type ClientFormProps = {
  action: (prevState: ClientFormState, formData: FormData) => Promise<ClientFormState>;
  partners: Partner[];
  defaultValues?: {
    name: string;
    document: string | null;
    email: string | null;
    phone: string | null;
    origin: "proprio" | "parceiro";
    origin_partner_id: string | null;
  };
};

export function ClientForm({ action, partners, defaultValues }: ClientFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
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
      <div className="flex flex-col gap-1">
        <label htmlFor="document" className={labelClass}>
          Documento (CPF/CNPJ)
        </label>
        <input
          id="document"
          name="document"
          defaultValue={defaultValues?.document ?? ""}
          className={inputClass}
        />
      </div>
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
      <div className="flex flex-col gap-1">
        <label htmlFor="origin" className={labelClass}>
          Origem *
        </label>
        <select
          id="origin"
          name="origin"
          defaultValue={defaultValues?.origin ?? "proprio"}
          className={inputClass}
        >
          <option value="proprio">Próprio</option>
          <option value="parceiro">Parceiro</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="origin_partner_id" className={labelClass}>
          Parceiro de origem
        </label>
        <select
          id="origin_partner_id"
          name="origin_partner_id"
          defaultValue={defaultValues?.origin_partner_id ?? ""}
          className={inputClass}
        >
          <option value="">—</option>
          {partners.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <div className={`${mobileStickyActionClass} grid grid-cols-2 gap-2 sm:flex sm:flex-row`}>
        <button type="submit" disabled={pending} className={`${buttonClass} w-full sm:w-auto`}>
          {pending ? "Salvando…" : "Salvar"}
        </button>
        <Link href="/admin/clientes" className={`${secondaryButtonClass} w-full sm:w-auto`}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
