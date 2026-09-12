"use client";

import { useState, useTransition } from "react";
import { deleteCatalogItem, toggleCatalogItemActive } from "./actions";
import { secondaryButtonClass, tdClass } from "@/lib/ui";

type ItemRowProps = {
  id: string;
  keyName: string;
  label: string;
  order: number;
  active: boolean;
};

export function ItemRow({ id, keyName, label, order, active }: ItemRowProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <tr>
      <td className={tdClass}>{keyName}</td>
      <td className={tdClass}>{label}</td>
      <td className={tdClass}>{order}</td>
      <td className={tdClass}>{active ? "Ativo" : "Inativo"}</td>
      <td className={tdClass}>
        <div className="flex items-center gap-3">
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
          {error && <span className="text-xs text-red-700">{error}</span>}
        </div>
      </td>
    </tr>
  );
}
