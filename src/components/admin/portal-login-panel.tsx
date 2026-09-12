"use client";

import { useActionState } from "react";
import {
  createPortalLoginAction,
  resetPortalPasswordAction,
  type PortalLoginState,
} from "./portal-login-actions";
import { buttonClass, secondaryButtonClass } from "@/lib/ui";

const initialState: PortalLoginState = {
  error: null,
  temporaryPassword: null,
  email: null,
};

type PortalLoginPanelProps = {
  kind: "company" | "driver";
  entityId: string;
  entityEmail: string | null;
  existingUserId?: string | null;
  existingUserEmail: string | null;
  existingUserStatus: string | null;
};

export function PortalLoginPanel({
  kind,
  entityId,
  entityEmail,
  existingUserId,
  existingUserEmail,
  existingUserStatus,
}: PortalLoginPanelProps) {
  const path = kind === "company" ? `/admin/empresas/${entityId}` : `/admin/motoristas/${entityId}`;

  const [createState, createAction, createPending] = useActionState(
    createPortalLoginAction.bind(null, kind, entityId, path),
    initialState,
  );

  const [resetState, resetAction, resetPending] = useActionState(
    resetPortalPasswordAction.bind(null, existingUserId ?? "", path),
    initialState,
  );

  const shownState = resetState.temporaryPassword || resetState.error ? resetState : createState;

  return (
    <div className="rounded-sm border border-forest/10 p-4">
      <h2 className="font-serif text-lg text-forest">Acesso ao portal</h2>

      {existingUserEmail ? (
        <div className="mt-3 flex flex-col gap-3">
          <p className="text-sm text-forest/70">
            Login existente: <strong>{existingUserEmail}</strong>{" "}
            {existingUserStatus === "ativo" ? "(ativo)" : "(inativo)"}
          </p>
          <form action={resetAction}>
            <button type="submit" disabled={resetPending} className={secondaryButtonClass}>
              {resetPending ? "Gerando…" : "Gerar nova senha temporária"}
            </button>
          </form>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <p className="text-sm text-forest/70">
            {entityEmail
              ? `Cria o acesso usando o e-mail cadastrado (${entityEmail}).`
              : "Cadastre um e-mail de portal acima antes de criar o acesso."}
          </p>
          <form action={createAction}>
            <button
              type="submit"
              disabled={createPending || !entityEmail}
              className={buttonClass}
            >
              {createPending ? "Criando…" : "Criar acesso ao portal"}
            </button>
          </form>
        </div>
      )}

      {shownState.error && (
        <p className="mt-3 text-sm text-red-700">{shownState.error}</p>
      )}
      {shownState.temporaryPassword && (
        <p className="mt-3 rounded-sm bg-gold/10 p-3 text-sm text-forest">
          Senha temporária (mostrada apenas uma vez, comunique ao usuário):{" "}
          <strong className="font-mono">{shownState.temporaryPassword}</strong>
        </p>
      )}
    </div>
  );
}
