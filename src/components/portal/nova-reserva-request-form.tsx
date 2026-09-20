"use client";

import { useActionState } from "react";
import { submitNovaReservaRequest, type ChangeRequestFormState } from "@/app/portal/empresa/actions";
import { buttonClass, inputClass, labelClass } from "@/lib/ui";

const initialState: ChangeRequestFormState = { error: null };

type ClientOption = { id: string; name: string; email: string | null };

export function NovaReservaRequestForm({
  dedupeKey,
  clients = [],
}: { dedupeKey: string; clients?: ClientOption[] }) {
  const [state, formAction, pending] = useActionState(submitNovaReservaRequest, initialState);

  return (
    <form action={formAction} className="flex w-full flex-col gap-3">
      <input type="hidden" name="dedupe_key" value={dedupeKey} />
      <div className="flex flex-col gap-1">
        <label htmlFor="cliente_nome" className={labelClass}>
          Cliente *
        </label>
        <input id="cliente_nome" name="cliente_nome" required className={inputClass} />
      </div>
      {clients.length > 0 && (
        <div className="flex flex-col gap-1">
          <label htmlFor="client_id" className={labelClass}>Cadastro existente</label>
          <select id="client_id" name="client_id" className={inputClass}>
            <option value="">Usar o nome informado acima</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>{client.name}{client.email ? ` · ${client.email}` : ""}</option>
            ))}
          </select>
        </div>
      )}
      <div className="flex flex-col gap-1">
        <label htmlFor="relacionamento" className={labelClass}>Como será o atendimento? *</label>
        <select id="relacionamento" name="relacionamento" required defaultValue="intermediado" className={inputClass}>
          <option value="intermediado">Meu parceiro atende o passageiro</option>
          <option value="indicacao">A Nativos atende o passageiro</option>
        </select>
        <p className="text-xs leading-5 text-forest/55">Isso define quem receberá voucher e comunicações. O passageiro não recebe mensagens financeiras.</p>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="descricao" className={labelClass}>
          O que você precisa? *
        </label>
        <textarea id="descricao" name="descricao" required rows={3} className={inputClass} />
      </div>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Enviando…" : "Solicitar nova reserva"}
      </button>
      <p className="text-xs text-forest/62">
        A equipe Nativos analisa e monta a reserva a partir do seu pedido.
      </p>
    </form>
  );
}
