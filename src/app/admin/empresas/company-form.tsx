"use client";

import { useActionState, useRef, useState } from "react";
import Link from "next/link";
import type { CompanyFormState } from "./actions";
import { buttonClass, inputClass, labelClass, secondaryButtonClass } from "@/lib/ui";

const initialState: CompanyFormState = { error: null };

type CatalogOption = { id: string; key: string; label: string };
type CommissionDefaultOption = { category_key: string; commission_percent: string };

type CompanyFormProps = {
  action: (prevState: CompanyFormState, formData: FormData) => Promise<CompanyFormState>;
  categories: CatalogOption[];
  commissionDefaults: CommissionDefaultOption[];
  defaultValues?: {
    name: string;
    document: string | null;
    legal_person: boolean;
    contact_name: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    roles: string[];
    portal_email: string | null;
    category_id: string | null;
    modelo_parceiro: string | null;
    billing_enabled: boolean;
    billing_limit: string | null;
    closing_day: number | null;
    invoice_due_day: number | null;
    requires_nf: boolean;
    net_enabled: boolean;
    commission_enabled: boolean;
    commission: string | null;
    pix_key: string | null;
    pix_key_type: string | null;
    pix_favorecido_name: string | null;
    recebe_pagamento_direto: boolean;
    direct_collection_settlement_mode: string | null;
    limite_inadimplencia: string | null;
  };
};

export function CompanyForm({
  action,
  categories,
  commissionDefaults,
  defaultValues,
}: CompanyFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [roles, setRoles] = useState<string[]>(defaultValues?.roles ?? []);
  const commissionInputRef = useRef<HTMLInputElement>(null);

  const isParceiro = roles.includes("parceiro");
  const isFornecedor = roles.includes("fornecedor");

  function toggleRole(role: string) {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  }

  function handleCategoryChange(categoryId: string) {
    if (commissionInputRef.current && !commissionInputRef.current.value) {
      const category = categories.find((c) => c.id === categoryId);
      const match = category
        ? commissionDefaults.find((d) => d.category_key === category.key)
        : undefined;
      if (match) {
        commissionInputRef.current.value = match.commission_percent;
      }
    }
  }

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-6">
      <fieldset className="flex flex-col gap-4">
        <legend className="font-serif text-lg text-forest">Dados gerais</legend>
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
        <div className="grid grid-cols-2 gap-4">
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
            <label htmlFor="legal_person" className={labelClass}>
              Tipo de pessoa
            </label>
            <select
              id="legal_person"
              name="legal_person"
              defaultValue={defaultValues ? (defaultValues.legal_person ? "pj" : "pf") : "pj"}
              className={inputClass}
            >
              <option value="pj">Pessoa jurídica</option>
              <option value="pf">Pessoa física</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="contact_name" className={labelClass}>
              Contato
            </label>
            <input
              id="contact_name"
              name="contact_name"
              defaultValue={defaultValues?.contact_name ?? ""}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="contact_email" className={labelClass}>
              E-mail de contato
            </label>
            <input
              id="contact_email"
              name="contact_email"
              type="email"
              defaultValue={defaultValues?.contact_email ?? ""}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="contact_phone" className={labelClass}>
              Telefone
            </label>
            <input
              id="contact_phone"
              name="contact_phone"
              defaultValue={defaultValues?.contact_phone ?? ""}
              className={inputClass}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="portal_email" className={labelClass}>
            E-mail de acesso ao portal
          </label>
          <input
            id="portal_email"
            name="portal_email"
            type="email"
            defaultValue={defaultValues?.portal_email ?? ""}
            className={inputClass}
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="font-serif text-lg text-forest">Papel</legend>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-forest/80">
            <input
              type="checkbox"
              name="roles"
              value="parceiro"
              checked={isParceiro}
              onChange={() => toggleRole("parceiro")}
            />
            Parceiro
          </label>
          <label className="flex items-center gap-2 text-sm text-forest/80">
            <input
              type="checkbox"
              name="roles"
              value="fornecedor"
              checked={isFornecedor}
              onChange={() => toggleRole("fornecedor")}
            />
            Fornecedor
          </label>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="category_id" className={labelClass}>
            Categoria
          </label>
          <select
            id="category_id"
            name="category_id"
            defaultValue={defaultValues?.category_id ?? ""}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className={inputClass}
          >
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      {isParceiro && (
        <fieldset className="flex flex-col gap-4 rounded-sm border border-forest/10 p-4">
          <legend className="font-serif text-lg text-forest">Parceiro</legend>
          <div className="flex flex-col gap-1">
            <label htmlFor="modelo_parceiro" className={labelClass}>
              Modelo
            </label>
            <select
              id="modelo_parceiro"
              name="modelo_parceiro"
              defaultValue={defaultValues?.modelo_parceiro ?? ""}
              className={inputClass}
            >
              <option value="">—</option>
              <option value="comissionado">Comissionado</option>
              <option value="faturado">Faturado</option>
              <option value="ambos">Ambos</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-forest/80">
              <input
                type="checkbox"
                name="commission_enabled"
                defaultChecked={defaultValues?.commission_enabled}
              />
              Comissão habilitada
            </label>
            <label className="flex items-center gap-2 text-sm text-forest/80">
              <input
                type="checkbox"
                name="requires_nf"
                defaultChecked={defaultValues?.requires_nf}
              />
              Exige nota fiscal
            </label>
            <label className="flex items-center gap-2 text-sm text-forest/80">
              <input
                type="checkbox"
                name="net_enabled"
                defaultChecked={defaultValues?.net_enabled}
              />
              Permite tarifa NET
            </label>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="commission" className={labelClass}>
              Comissão (%)
            </label>
            <input
              id="commission"
              name="commission"
              ref={commissionInputRef}
              defaultValue={defaultValues?.commission ?? ""}
              inputMode="decimal"
              className={inputClass}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-forest/80">
            <input
              type="checkbox"
              name="billing_enabled"
              defaultChecked={defaultValues?.billing_enabled}
            />
            Faturamento habilitado
          </label>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="billing_limit" className={labelClass}>
                Limite de faturamento (R$)
              </label>
              <input
                id="billing_limit"
                name="billing_limit"
                inputMode="decimal"
                defaultValue={defaultValues?.billing_limit ?? ""}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="closing_day" className={labelClass}>
                Dia de fechamento
              </label>
              <input
                id="closing_day"
                name="closing_day"
                inputMode="numeric"
                defaultValue={defaultValues?.closing_day ?? ""}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="invoice_due_day" className={labelClass}>
                Dia de vencimento
              </label>
              <input
                id="invoice_due_day"
                name="invoice_due_day"
                inputMode="numeric"
                defaultValue={defaultValues?.invoice_due_day ?? ""}
                className={inputClass}
              />
            </div>
          </div>
        </fieldset>
      )}

      {isFornecedor && (
        <fieldset className="flex flex-col gap-4 rounded-sm border border-forest/10 p-4">
          <legend className="font-serif text-lg text-forest">Fornecedor</legend>
          <label className="flex items-center gap-2 text-sm text-forest/80">
            <input
              type="checkbox"
              name="recebe_pagamento_direto"
              defaultChecked={defaultValues?.recebe_pagamento_direto}
            />
            Recebe pagamento direto do passageiro
          </label>
          <div className="flex flex-col gap-1">
            <label htmlFor="direct_collection_settlement_mode" className={labelClass}>
              Modo de liquidação do pagamento direto
            </label>
            <select
              id="direct_collection_settlement_mode"
              name="direct_collection_settlement_mode"
              defaultValue={defaultValues?.direct_collection_settlement_mode ?? ""}
              className={inputClass}
            >
              <option value="">—</option>
              <option value="retain_supplier_cost">
                Retém o próprio custo e repassa só a margem
              </option>
              <option value="gross_repass">Repassa o valor bruto</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="limite_inadimplencia" className={labelClass}>
              Limite de inadimplência (R$)
            </label>
            <input
              id="limite_inadimplencia"
              name="limite_inadimplencia"
              inputMode="decimal"
              defaultValue={defaultValues?.limite_inadimplencia ?? ""}
              className={inputClass}
            />
          </div>
        </fieldset>
      )}

      <fieldset className="flex flex-col gap-4 rounded-sm border border-forest/10 p-4">
        <legend className="font-serif text-lg text-forest">PIX</legend>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="pix_key_type" className={labelClass}>
              Tipo de chave
            </label>
            <select
              id="pix_key_type"
              name="pix_key_type"
              defaultValue={defaultValues?.pix_key_type ?? ""}
              className={inputClass}
            >
              <option value="">—</option>
              <option value="cpf">CPF</option>
              <option value="cnpj">CNPJ</option>
              <option value="email">E-mail</option>
              <option value="telefone">Telefone</option>
              <option value="aleatoria">Aleatória</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="pix_key" className={labelClass}>
              Chave PIX
            </label>
            <input
              id="pix_key"
              name="pix_key"
              defaultValue={defaultValues?.pix_key ?? ""}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="pix_favorecido_name" className={labelClass}>
              Nome do favorecido
            </label>
            <input
              id="pix_favorecido_name"
              name="pix_favorecido_name"
              defaultValue={defaultValues?.pix_favorecido_name ?? ""}
              className={inputClass}
            />
          </div>
        </div>
      </fieldset>

      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Salvando…" : "Salvar"}
        </button>
        <Link href="/admin/empresas" className={secondaryButtonClass}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
