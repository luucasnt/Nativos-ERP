"use client";

import { useTransition } from "react";
import { setDriverStatus } from "./actions";
import { secondaryButtonClass } from "@/lib/ui";

export function DriverStatusToggle({ id, status }: { id: string; status: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-forest/70">
        Status operacional: <strong>{status === "ativo" ? "Ativo" : "Inativo"}</strong>
      </span>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(() => setDriverStatus(id, status === "ativo" ? "inativo" : "ativo"))
        }
        className={`${secondaryButtonClass} px-3 py-1 text-sm`}
      >
        {status === "ativo" ? "Desativar" : "Ativar"}
      </button>
    </div>
  );
}
