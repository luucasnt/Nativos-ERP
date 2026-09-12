"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { EmailTemplateFormState } from "./actions";
import { buttonClass, inputClass, labelClass, secondaryButtonClass } from "@/lib/ui";

const initialState: EmailTemplateFormState = { error: null };

type TemplateFormProps = {
  action: (prevState: EmailTemplateFormState, formData: FormData) => Promise<EmailTemplateFormState>;
  defaultValues?: {
    key: string;
    name: string;
    subject: string;
    body: string;
    category: string;
    auto_send: boolean;
    allowed_variables: string[];
  };
};

export function TemplateForm({ action, defaultValues }: TemplateFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="key" className={labelClass}>
          Chave *
        </label>
        <input
          id="key"
          name="key"
          required
          disabled={Boolean(defaultValues)}
          defaultValue={defaultValues?.key}
          className={`${inputClass} disabled:bg-forest/5`}
        />
      </div>
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
        <label htmlFor="category" className={labelClass}>
          Categoria *
        </label>
        <input
          id="category"
          name="category"
          required
          defaultValue={defaultValues?.category}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="subject" className={labelClass}>
          Assunto *
        </label>
        <input
          id="subject"
          name="subject"
          required
          defaultValue={defaultValues?.subject}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="body" className={labelClass}>
          Corpo (HTML) *
        </label>
        <textarea
          id="body"
          name="body"
          required
          rows={8}
          defaultValue={defaultValues?.body}
          className={`${inputClass} font-mono text-xs`}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="allowed_variables" className={labelClass}>
          Variáveis permitidas (separadas por vírgula)
        </label>
        <input
          id="allowed_variables"
          name="allowed_variables"
          defaultValue={defaultValues?.allowed_variables.join(", ")}
          className={inputClass}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-forest/80">
        <input type="checkbox" name="auto_send" defaultChecked={defaultValues?.auto_send} />
        Disparo automático por evento
      </label>

      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Salvando…" : "Salvar"}
        </button>
        <Link href="/admin/configuracoes/emails" className={secondaryButtonClass}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
