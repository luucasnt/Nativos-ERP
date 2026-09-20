"use client";

import { useActionState, useState, useTransition } from "react";
import { secondaryButtonClass } from "@/lib/ui";
import { resetPortalAccessPassword, setPortalAccessStatus, type AccessActionState } from "./actions";

export function AccessRow({ id, email, label, detail, status }: { id: string; email: string; label: string; detail: string; status: string }) {
  const [pending, startTransition] = useTransition();
  const [localError, setLocalError] = useState<string | null>(null);
  const [state, action, resetPending] = useActionState<AccessActionState, FormData>(resetPortalAccessPassword.bind(null, id), { error: null, temporaryPassword: null });
  const active = status === "ativo";
  return <article className="surface-panel p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0"><p className="font-semibold text-forest">{label}</p><p className="mt-1 break-all text-sm text-forest/62">{email}</p><p className="mt-1 text-xs text-forest/55">{detail}</p></div>
      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${active ? "bg-success-light text-success" : "bg-forest/[0.06] text-forest/62"}`}>{active ? "Ativo" : "Inativo"}</span>
    </div>
    <div className="mt-4 flex flex-wrap gap-2">
      <button type="button" disabled={pending} onClick={() => startTransition(async () => { try { await setPortalAccessStatus(id, active ? "inativo" : "ativo"); } catch (e) { setLocalError(e instanceof Error ? e.message : "Falha ao atualizar acesso."); } })} className="text-sm font-semibold text-forest underline decoration-gold">{active ? "Desativar" : "Ativar"}</button>
      <form action={action}><button type="submit" disabled={resetPending} className={`${secondaryButtonClass} px-3 py-2 text-xs`}>{resetPending ? "Gerando…" : "Redefinir senha"}</button></form>
    </div>
    {(localError || state.error) && <p className="mt-3 text-xs text-danger">{localError || state.error}</p>}
    {state.temporaryPassword && <p className="mt-3 rounded-lg bg-gold/10 p-3 text-sm text-forest">Senha temporária: <strong className="font-mono">{state.temporaryPassword}</strong></p>}
  </article>;
}
