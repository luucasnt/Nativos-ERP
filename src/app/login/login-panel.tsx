"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Wordmark } from "@/components/brand/logo";
import { LoginForm } from "./login-form";

const FEATURES = [
  "Controle financeiro completo, sem exclusão de lançamentos",
  "Portais dedicados para parceiros, fornecedores e motoristas",
  "Trilha de auditoria completa de todas as operações",
];

// Puramente informativo: a plataforma tem um único formulário de login
// pra todos os 4 públicos — o destino (admin/portal) é decidido no
// backend a partir do tipo de conta autenticada, não por essa seleção.
// Ainda assim é um controle real (estado local, clicável), não decorativo
// morto.
const ACCESS_TYPES = ["Admin", "Parceiro", "Fornecedor", "Motorista"] as const;

export function LoginPanel({ next }: { next?: string }) {
  const [accessType, setAccessType] = useState<(typeof ACCESS_TYPES)[number]>("Admin");

  return (
    <div className="flex min-h-screen flex-1">
      <div className="hidden w-[420px] shrink-0 flex-col justify-between bg-forest-900 px-11 py-12 text-white lg:flex">
        <Wordmark size={20} tone="cream-on-forest" />

        <div>
          <h1 className="mb-3.5 text-[26px] leading-[1.3] font-semibold tracking-tight">
            Gestão operacional e financeira da Nativos Experiences
          </h1>
          <p className="mb-7 text-sm leading-relaxed text-sage-400">
            Reservas, motoristas, fornecedores e financeiro em uma única
            plataforma.
          </p>
          <ul className="flex flex-col gap-3.5">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-2.5 text-[13.5px] text-sage-400">
                <Check size={15} strokeWidth={2.5} className="shrink-0 text-gold-500" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-white/10 pt-4.5 text-xs text-ink-350">
          Nativos Experiences © 2026 — Trancoso, BA
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-gray-50 px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full max-w-[380px] rounded-md border border-border bg-white px-9 py-10"
        >
          <h2 className="mb-1.5 text-xl font-bold tracking-tight text-ink-900">
            Acessar sistema
          </h2>
          <p className="mb-6.5 text-[13.5px] leading-relaxed text-ink-500">
            Selecione seu tipo de acesso e entre com suas credenciais.
          </p>

          <div className="mb-6 grid grid-cols-4 overflow-hidden rounded-[5px] border border-border">
            {ACCESS_TYPES.map((type, index) => (
              <button
                key={type}
                type="button"
                onClick={() => setAccessType(type)}
                className={`px-1 py-2.5 text-xs font-medium transition-colors ${
                  index < ACCESS_TYPES.length - 1 ? "border-r border-border" : ""
                } ${accessType === type ? "bg-forest-700 text-white" : "bg-white text-ink-500 hover:bg-gray-50"}`}
              >
                {type}
              </button>
            ))}
          </div>

          <LoginForm next={next} />

          <p className="mt-4.5 text-center text-[12.5px] text-ink-500">
            Esqueceu sua senha?{" "}
            <a href="/recuperar-acesso" className="font-semibold text-forest-700">
              Recuperar acesso
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
