"use client";

import { useState, useTransition } from "react";
import { resetInternalUserPasswordAction, setInternalUserStatus } from "./actions";
import { secondaryButtonClass, tdClass } from "@/lib/ui";

type UserRowProps = {
  id: string;
  email: string;
  nativeName: string | null;
  displayName: string | null;
  internalRole: string | null;
  isOwner: boolean;
  status: string;
};

export function UserRow({
  id,
  email,
  nativeName,
  displayName,
  internalRole,
  isOwner,
  status,
}: UserRowProps) {
  const [isPending, startTransition] = useTransition();
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);

  return (
    <tr>
      <td className={tdClass}>{displayName ?? nativeName ?? "—"}</td>
      <td className={tdClass}>{email}</td>
      <td className={tdClass}>{isOwner ? "Proprietário" : internalRole}</td>
      <td className={tdClass}>{status === "ativo" ? "Ativo" : "Inativo"}</td>
      <td className={tdClass}>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                startTransition(() =>
                  setInternalUserStatus(id, status === "ativo" ? "inativo" : "ativo"),
                )
              }
              className="text-sm text-forest underline decoration-gold"
            >
              {status === "ativo" ? "Desativar" : "Ativar"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const result = await resetInternalUserPasswordAction(id, {
                    error: null,
                    temporaryPassword: null,
                    email: null,
                  });
                  setTemporaryPassword(result.temporaryPassword);
                })
              }
              className={`${secondaryButtonClass} px-2 py-1 text-xs`}
            >
              Nova senha
            </button>
          </div>
          {temporaryPassword && (
            <span className="font-mono text-xs text-forest">{temporaryPassword}</span>
          )}
        </div>
      </td>
    </tr>
  );
}
