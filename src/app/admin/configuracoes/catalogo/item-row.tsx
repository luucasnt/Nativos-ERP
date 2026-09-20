"use client";

import { useActionState, useState, useTransition } from "react";
import { deleteCatalogItem, toggleCatalogItemActive, updateCatalogItem, type CatalogItemFormState } from "./actions";
import { inputClass, secondaryButtonClass, tdClass } from "@/lib/ui";

type ItemRowProps = {
  id: string;
  keyName: string;
  label: string;
  order: number;
  active: boolean;
  type: string;
};

export function ItemRow({ id, keyName, label, order, active, type }: ItemRowProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [state, formAction, savePending] = useActionState<CatalogItemFormState, FormData>(updateCatalogItem.bind(null, id), { error: null });

  return (
    <tr>
      <td className={tdClass}>{editing ? <input name="key" defaultValue={keyName} required className={`${inputClass} min-w-32`} form={`edit-catalog-${id}`} /> : keyName}</td>
      <td className={tdClass}>{editing ? <input name="label" defaultValue={label} required className={`${inputClass} min-w-40`} form={`edit-catalog-${id}`} /> : label}</td>
      <td className={tdClass}>{editing ? <input name="order" type="number" defaultValue={order} className={`${inputClass} w-20`} form={`edit-catalog-${id}`} /> : order}</td>
      <td className={tdClass}>{active ? "Ativo" : "Inativo"}</td>
      <td className={tdClass}>
        {editing && <form id={`edit-catalog-${id}`} action={formAction}><input type="hidden" name="type" value={type} /></form>}
        <div className="flex flex-wrap items-center gap-3">
          {editing ? <><button type="submit" form={`edit-catalog-${id}`} disabled={savePending} className="text-sm font-semibold text-forest underline decoration-gold">{savePending ? "Salvando…" : "Salvar"}</button><button type="button" onClick={() => setEditing(false)} className="text-sm text-forest/65 underline">Cancelar</button></> : <button type="button" onClick={() => setEditing(true)} className="text-sm font-semibold text-forest underline decoration-gold">Editar</button>}
          <button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => toggleCatalogItemActive(id, !active))}
            className="text-sm text-forest underline decoration-gold"
          >
            {active ? "Desativar" : "Ativar"}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await deleteCatalogItem(id);
                setError(result.error);
              })
            }
            className={`${secondaryButtonClass} px-2 py-1 text-xs`}
          >
            Excluir
          </button>
          {(error || state.error) && <span className="text-xs text-red-700">{error || state.error}</span>}
        </div>
      </td>
    </tr>
  );
}
