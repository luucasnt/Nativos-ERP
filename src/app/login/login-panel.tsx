"use client";

import { motion } from "framer-motion";
import { Building2, LayoutDashboard, Truck, Car } from "lucide-react";
import { Wordmark } from "@/components/brand/logo";
import { LoginForm } from "./login-form";

const ACCESS_TYPES = [
  { label: "Admin", icon: LayoutDashboard, className: "bg-forest/10 text-forest" },
  { label: "Parceiro", icon: Building2, className: "bg-gold/20 text-forest" },
  { label: "Fornecedor", icon: Truck, className: "bg-info-light text-info" },
  { label: "Motorista", icon: Car, className: "bg-warning-light text-warning" },
] as const;

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

export function LoginPanel({ next }: { next?: string }) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="w-full max-w-sm"
    >
      <motion.div variants={item} className="mb-8 flex flex-col items-start gap-4">
        <Wordmark size={30} tone="forest-on-cream" />
        <div>
          <h1 className="font-serif text-2xl text-forest">Bem-vindo de volta</h1>
          <p className="mt-1 text-sm text-forest/60">
            Trancoso te espera — acesse com o e-mail cadastrado pela Nativos Experiences.
          </p>
        </div>
      </motion.div>

      <motion.div variants={item} className="mb-8 flex flex-wrap gap-2">
        {ACCESS_TYPES.map(({ label, icon: Icon, className }) => (
          <span
            key={label}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${className}`}
          >
            <Icon size={13} strokeWidth={2} aria-hidden="true" />
            {label}
          </span>
        ))}
      </motion.div>

      <motion.div variants={item}>
        <LoginForm next={next} />
      </motion.div>
    </motion.div>
  );
}
