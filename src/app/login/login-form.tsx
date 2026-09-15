"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { signIn, type SignInState } from "./actions";

const initialState: SignInState = { error: null };

export function LoginForm({ next, portal }: { next?: string; portal: "admin" | "parceiro" | "fornecedor" | "motorista" }) {
  const [state, formAction, pending] = useActionState(signIn, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {next && <input type="hidden" name="next" value={next} />}

      <div className="flex flex-col gap-1.5">
          <label htmlFor="identifier" className="text-xs font-medium text-forest/72">
          E-mail ou telefone
        </label>
        <div className="relative">
          <Mail
            size={15}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-forest/36"
          />
          <input
            id="identifier"
            name="identifier"
            type="text"
            required
            autoFocus
            autoComplete="username"
            placeholder="seu e-mail ou (73) 99999-9999"
            className="focus-ring h-11 w-full rounded-lg border border-forest/15 bg-white pl-9 pr-3 text-sm text-ink outline-none transition hover:border-forest/25 focus:border-forest"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-xs font-medium text-forest/72">
          Senha
        </label>
        <div className="relative">
          <LockKeyhole
            size={15}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-forest/36"
          />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            placeholder="Digite sua senha"
            className="focus-ring h-11 w-full rounded-lg border border-forest/15 bg-white pl-9 pr-10 text-sm text-ink outline-none transition hover:border-forest/25 focus:border-forest"
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            className="focus-ring absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-forest/55 transition hover:bg-forest/5 hover:text-forest"
          >
            {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {state.error && (
        <p role="alert" className="rounded-lg border border-danger/15 bg-danger-light px-3 py-2.5 text-sm text-danger">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="focus-ring mt-1 inline-flex h-11 items-center justify-center rounded-lg bg-forest px-4 text-sm font-semibold text-cream transition hover:bg-forest-light disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>
      {portal !== "admin" && (
        <a
          href={`https://wa.me/5573991681630?text=${encodeURIComponent("Olá, sou usuário do portal Nativos e preciso solicitar uma nova senha de acesso. Meu e-mail ou telefone cadastrado é: ")}`}
          target="_blank"
          rel="noreferrer"
          className="focus-ring self-center text-xs font-medium text-forest/55 underline decoration-gold/60 underline-offset-4 hover:text-forest"
        >
          Esqueci minha senha · solicitar pelo WhatsApp
        </a>
      )}
    </form>
  );
}
