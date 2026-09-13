"use client";

import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

type PageTransitionProps = {
  children: React.ReactNode;
};

// Transição suave entre páginas (fade + slide curto) em vez de troca
// instantânea/estática — usado dentro do <main> do AppShell. `mode="wait"`
// evita as duas páginas aparecerem sobrepostas durante a troca.
export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
