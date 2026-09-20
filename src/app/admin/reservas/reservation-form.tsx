"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { ReservationFormState } from "./actions";
import { buttonClass, inputClass, labelClass, mobileStickyActionClass, secondaryButtonClass } from "@/lib/ui";
import { SearchableEntitySelect } from "@/components/ui/searchable-entity-select";

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
  const initialRelationshipMode = defaultValues?.origin_partner_id
    ? "intermediado"
    : defaultValues?.referrer_type
      ? "indicacao"
      : "direto";
  const [relationshipMode, setRelationshipMode] = useState(initialRelationshipMode);
  const [referrerType, setReferrerType] = useState(defaultValues?.referrer_type ?? "");
  const [requiresNf, setRequiresNf] = useState(defaultValues?.requires_nf ?? false);
  const [collectionMode, setCollectionMode] = useState(defaultValues?.collection_mode ?? "nativos");


  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="client_id" className={labelClass}>
          Cliente *
        </label>
        <SearchableEntitySelect name="client_id" label="Cliente" entity="client" value={defaultValues?.client_id} initialOptions={clients} required />
      </div>

      <fieldset className="flex flex-col gap-3 rounded-xl border border-forest/10 p-4">
        <legend className="font-serif text-lg text-forest">Origem e relacionamento</legend>
        <div className="flex flex-col gap-1">
          <label htmlFor="relationship_mode" className={labelClass}>Quem conduz o atendimento do passageiro? *</label>
          <select
            id="relationship_mode"
            name="relationship_mode"
            value={relationshipMode}
            onChange={(event) => {
              const mode = event.target.value;
              setRelationshipMode(mode);
              if (mode === "intermediado") setCollectionMode("faturado");
              else if (collectionMode === "faturado") setCollectionMode("nativos");
            }}
            className={inputClass}
          >
            <option value="direto">Cliente direto — Nativos atende o passageiro</option>
            <option value="indicacao">Indicação — parceiro indica e Nativos atende</option>
            <option value="intermediado">Intermediação — parceiro atende o passageiro</option>
          </select>
          <p className="text-xs leading-5 text-forest/60">
            Esta escolha controla quem recebe voucher, comunicações e cobranças. O passageiro nunca recebe mensagens financeiras por e-mail.
          </p>
        </div>

        {relationshipMode === "intermediado" && (
          <div className="flex flex-col gap-1">
            <label htmlFor="origin_partner_id" className={labelClass}>Parceiro responsável pelo atendimento *</label>
            <SearchableEntitySelect name="origin_partner_id" label="Parceiro responsável" entity="partner" value={defaultValues?.origin_partner_id ?? ""} initialOptions={partners} required />
            <p className="text-xs leading-5 text-forest/60">A Nativos trata operação e financeiro com o parceiro. Voucher e informações comerciais não são enviados diretamente ao passageiro.</p>
          </div>
        )}
      </fieldset>

      {relationshipMode === "indicacao" && <fieldset className="flex flex-col gap-3 rounded-xl border border-forest/10 p-4">
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
            <SearchableEntitySelect name="referrer_id" label="Indicador" entity={referrerType === "company" ? "company" : referrerType === "driver" ? "driver" : "client"} value={defaultValues?.referrer_id ?? ""} initialOptions={referrerType === "company" ? companies : referrerType === "driver" ? drivers : clients} required />
          </div>
        )}

        {referrerType === "pessoa_fisica" && (
          <div className="grid gap-4 sm:grid-cols-2">
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
      </fieldset>}

      <div className="flex flex-col gap-1">
        <label htmlFor="collection_mode" className={labelClass}>
          Modo de cobrança *
        </label>
        <select
          id="collection_mode"
          name="collection_mode"
          value={collectionMode}
          onChange={(event) => setCollectionMode(event.target.value)}
          className={inputClass}
        >
          {relationshipMode === "intermediado" ? (
            <option value="faturado">Cobrança ao parceiro responsável</option>
          ) : (
            <>
              <option value="nativos">Nativos cobra o passageiro</option>
              <option value="direto">Pagamento direto ao motorista/fornecedor</option>
            </>
          )}
        </select>
        <p className="text-xs leading-5 text-forest/60">
          {relationshipMode === "intermediado"
            ? "O parceiro responde comercialmente pelo passageiro; a obrigação financeira fica registrada contra o parceiro."
            : "A comunicação financeira com o passageiro continua fora do e-mail; somente o voucher pode ser enviado a ele."}
        </p>
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm text-forest/80">
          <input type="checkbox" name="is_cortesia" defaultChecked={defaultValues?.is_cortesia} />
          Cortesia
        </label>
        {relationshipMode === "intermediado" && <label className="flex items-center gap-2 text-sm text-forest/80">
          <input type="checkbox" name="is_net_fare" defaultChecked={defaultValues?.is_net_fare} />
          Tarifa NET (sem comissão de parceiro)
        </label>}
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
        <div className="flex flex-col gap-1 rounded-xl border border-forest/10 p-4">
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
          <p className="text-xs text-forest/62">
            Preencher aqui congela a alíquota desta reserva, sobrepondo o
            padrão global de Configurações &gt; Impostos. Deixar em branco
            remove a sobreposição — sem alíquota definida em nenhum dos
            dois lugares, o imposto não é calculado.
          </p>
        </div>
      )}

      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <div className={`${mobileStickyActionClass} grid grid-cols-2 gap-2 sm:flex sm:flex-row`}>
        <button type="submit" disabled={pending} className={`${buttonClass} w-full sm:w-auto`}>
          {pending ? "Salvando…" : "Salvar"}
        </button>
        <Link href={cancelHref} className={`${secondaryButtonClass} w-full sm:w-auto`}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
