"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { ClauseFormState } from "./actions";
import { buttonClass, inputClass, labelClass, secondaryButtonClass } from "@/lib/ui";

const initialState: ClauseFormState = { error: null };

type ClauseFormProps = {
  action: (prevState: ClauseFormState, formData: FormData) => Promise<ClauseFormState>;
  defaultValues?: {
    category: string;
    order: number;
    title: string;
    content: string;
    active: boolean;
  };
};

export function ClauseForm({ action, defaultValues }: ClauseFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
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
          <label htmlFor="order" className={labelClass}>
            Ordem
          </label>
          <input
            id="order"
            name="order"
            type="number"
            defaultValue={defaultValues?.order ?? 0}
            className={inputClass}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="title" className={labelClass}>
          Título *
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={defaultValues?.title}
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="content" className={labelClass}>
          Conteúdo *
        </label>
        <textarea
          id="content"
          name="content"
          required
          rows={8}
          defaultValue={defaultValues?.content}
          className={inputClass}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-forest/80">
        <input
          type="checkbox"
          name="active"
          defaultChecked={defaultValues?.active ?? true}
        />
        Ativa
      </label>

      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Salvando…" : "Salvar"}
        </button>
        <Link href="/admin/configuracoes/contratos" className={secondaryButtonClass}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
