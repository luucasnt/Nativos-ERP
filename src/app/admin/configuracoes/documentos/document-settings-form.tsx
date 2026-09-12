"use client";

import { useActionState } from "react";
import { updateDocumentSettings, type DocumentSettingsState } from "./actions";
import { buttonClass } from "@/lib/ui";

const initialState: DocumentSettingsState = { error: null, saved: false };

export function DocumentSettingsForm({
  voucherDefault,
  osDefault,
}: {
  voucherDefault: boolean;
  osDefault: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateDocumentSettings, initialState);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <label className="flex items-center gap-2 text-sm text-forest/80">
        <input type="checkbox" name="voucher_default" defaultChecked={voucherDefault} />
        Exibir valor do serviço no voucher por padrão
      </label>
      <label className="flex items-center gap-2 text-sm text-forest/80">
        <input type="checkbox" name="os_default" defaultChecked={osDefault} />
        Exibir valor do serviço na ordem de serviço do motorista por padrão
      </label>
      <p className="text-xs text-forest/50">
        Cada reserva (voucher) ou serviço (ordem de serviço) pode substituir
        este padrão individualmente.
      </p>
      <div>
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Salvando…" : "Salvar"}
        </button>
      </div>
      {state.saved && <p className="text-sm text-forest">Configuração salva.</p>}
    </form>
  );
}
