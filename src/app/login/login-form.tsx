"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "./actions";

const initialState: SignInState = { error: null };

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <form action={formAction}>
      {next && <input type="hidden" name="next" value={next} />}
      <div className="mb-[18px]">
        <label htmlFor="email" className="mb-1.5 block text-[12.5px] font-semibold text-ink-900">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="nome@nativosexperiences.com"
          className="w-full rounded-[5px] border border-border bg-white px-3 py-[11px] text-sm text-ink-900 outline-none placeholder:text-ink-350 focus:border-forest-700"
        />
      </div>
      <div className="mb-[18px]">
        <label htmlFor="password" className="mb-1.5 block text-[12.5px] font-semibold text-ink-900">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="w-full rounded-[5px] border border-border bg-white px-3 py-[11px] text-sm text-ink-900 outline-none placeholder:text-ink-350 focus:border-forest-700"
        />
      </div>
      {state.error && <p className="mb-3 text-[13px] font-medium text-brick-500">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-1 w-full rounded-[5px] bg-forest-700 py-3 text-sm font-semibold text-white transition-colors hover:bg-forest-600 disabled:opacity-60"
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
