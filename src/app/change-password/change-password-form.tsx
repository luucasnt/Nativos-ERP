"use client";

import { useActionState } from "react";
import { changePassword, type ChangePasswordState } from "./actions";

const initialState: ChangePasswordState = { error: null };

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(
    changePassword,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm text-forest/80">
          Nova senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="rounded-sm border border-forest/20 bg-white px-3 py-2 text-ink outline-none focus:border-gold"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="confirmPassword" className="text-sm text-forest/80">
          Confirme a nova senha
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="rounded-sm border border-forest/20 bg-white px-3 py-2 text-ink outline-none focus:border-gold"
        />
      </div>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-sm bg-forest px-4 py-2 text-cream transition hover:bg-forest-light disabled:opacity-60"
      >
        {pending ? "Salvando…" : "Definir nova senha"}
      </button>
    </form>
  );
}
