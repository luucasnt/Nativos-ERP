"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { ReservationFormState } from "./actions";
import { buttonClass, inputClass, labelClass, secondaryButtonClass } from "@/lib/ui";

const initialState: ReservationFormState = { error: null };

type Option = { id: string; name: string };

type ReservationFormProps = {
  action: (prevState: ReservationFormState, formData: FormData) => Promise<ReservationFormState>;
  clients: Option[];
  partners: Option[];
  companies: Option[];
  drivers: Option[];
  cancelHref: string;
  defaultValues?: {
    client_id: string;
    origin_partner_id: string | null;
    referrer_type: string | null;
    referrer_id: string | null;
    referrer_name: string | null;
    referrer_document: string | null;
    commission_percent: string | null;
    is_cortesia: boolean;
    is_net_fare: boolean;
    requires_nf: boolean;
    collection_mode: string;
    tax_percent_snapshot: string | null;
  };
};

export function ReservationForm({
  action,
  clients,
  partners,
  companies,
  drivers,
  cancelHref,
  defaultValues,
}: ReservationFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [referrerType, setReferrerType] = useState(defaultValues?.referrer_type ?? "");
  const [requiresNf, setRequiresNf] = useState(defaultValues?.requires_nf ?? false);

  const referrerOptions = referrerType === "company" ? companies : referrerType === "driver" ? drivers : referrerType === "client" ? clients : [];

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="client_id" className={labelClass}>
          Cliente *
        </label>
        <select
          id="client_id"
          name="client_id"
          required
          defaultValue={defaultValues?.client_id ?? ""}
          className={inputClass}
        >
          <option value="">—</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
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

      <fieldset className="flex flex-col gap-3 rounded-sm border border-forest/10 p-4">
        <legend className="font-serif text-lg text-forest">Indicação</legend>
        <div className="flex flex-col gap-1">
          <label htmlFor="referrer_type" className={labelClass}>
            Tipo de indicador
          </label>
          <select
            id="referrer_type"
            name="referrer_type"
            value={referrerType}
            onChange={(e) => setReferrerType(e.target.value)}
            className={inputClass}
          >
            <option value="">Sem indicação</option>
            <option value="company">Empresa</option>
            <option value="driver">Motorista</option>
            <option value="client">Cliente</option>
            <option value="pessoa_fisica">Pessoa física avulsa</option>
          </select>
        </div>

        {referrerType && referrerType !== "pessoa_fisica" && (
          <div className="flex flex-col gap-1">
            <label htmlFor="referrer_id" className={labelClass}>
              Indicador *
            </label>
            <select id="referrer_id" name="referrer_id" defaultValue={defaultValues?.referrer_id ?? ""} className={inputClass}>
              <option value="">—</option>
              {referrerOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {referrerType === "pessoa_fisica" && (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="referrer_name" className={labelClass}>
                Nome *
              </label>
              <input
                id="referrer_name"
                name="referrer_name"
                defaultValue={defaultValues?.referrer_name ?? ""}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="referrer_document" className={labelClass}>
                Documento
              </label>
              <input
                id="referrer_document"
                name="referrer_document"
                defaultValue={defaultValues?.referrer_document ?? ""}
                className={inputClass}
              />
            </div>
          </div>
        )}

        {referrerType && (
          <div className="flex flex-col gap-1">
            <label htmlFor="commission_percent" className={labelClass}>
              Comissão de indicação (%)
            </label>
            <input
              id="commission_percent"
              name="commission_percent"
              inputMode="decimal"
              defaultValue={defaultValues?.commission_percent ?? ""}
              className={inputClass}
            />
          </div>
        )}
      </fieldset>

      <div className="flex flex-col gap-1">
        <label htmlFor="collection_mode" className={labelClass}>
          Modo de cobrança *
        </label>
        <select
          id="collection_mode"
          name="collection_mode"
          defaultValue={defaultValues?.collection_mode ?? "nativos"}
          className={inputClass}
        >
          <option value="nativos">Nativos cobra o passageiro</option>
          <option value="direto">Pagamento direto (motorista/fornecedor)</option>
          <option value="faturado">Faturado ao parceiro</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm text-forest/80">
          <input type="checkbox" name="is_cortesia" defaultChecked={defaultValues?.is_cortesia} />
          Cortesia
        </label>
        <label className="flex items-center gap-2 text-sm text-forest/80">
          <input type="checkbox" name="is_net_fare" defaultChecked={defaultValues?.is_net_fare} />
          Tarifa NET (sem comissão de parceiro)
        </label>
        <label className="flex items-center gap-2 text-sm text-forest/80">
          <input
            type="checkbox"
            name="requires_nf"
            checked={requiresNf}
            onChange={(e) => setRequiresNf(e.target.checked)}
          />
          Exige nota fiscal
        </label>
      </div>

      {requiresNf && (
        <div className="flex flex-col gap-1 rounded-sm border border-forest/10 p-4">
          <label htmlFor="tax_percent_override" className={labelClass}>
            Alíquota de imposto para esta reserva (%)
          </label>
          <input
            id="tax_percent_override"
            name="tax_percent_override"
            inputMode="decimal"
            placeholder="deixe em branco para usar o padrão global (se houver)"
            defaultValue={defaultValues?.tax_percent_snapshot ?? ""}
            className={inputClass}
          />
          <p className="text-xs text-forest/50">
            Preencher aqui congela a alíquota desta reserva, sobrepondo o
            padrão global de Configurações &gt; Impostos. Deixar em branco
            remove a sobreposição — sem alíquota definida em nenhum dos
            dois lugares, o imposto não é calculado.
          </p>
        </div>
      )}

      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Salvando…" : "Salvar"}
        </button>
        <Link href={cancelHref} className={secondaryButtonClass}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
