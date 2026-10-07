"use client";

import { useState } from "react";
import { resetDemoData } from "./actions";

export function ResetDemoDataButton() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReset() {
    const confirmed = window.confirm(
      "ATENÇÃO: isso apagará todos os dados de teste do ERP e todos os usuários, exceto seu usuário proprietário. Estrutura e migrações serão preservadas. Continuar?",
    );
    if (!confirmed) return;
    const second = window.prompt('Digite ZERAR para confirmar:');
    if (second !== "ZERAR") return;

    setBusy(true);
    setError(null);
    try {
      await resetDemoData();
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível zerar o sistema.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="surface-panel border border-red-200 p-5">
      <p className="eyebrow text-red-700">Ação irreversível</p>
      <h2 className="mt-1 text-lg font-semibold text-forest">Zerar dados de demonstração</h2>
      <p className="mt-2 text-sm text-forest/60">
        Remove reservas, serviços, financeiro, cadastros, configurações e acessos de teste. Seu usuário proprietário é preservado.
      </p>
      <button
        type="button"
        onClick={handleReset}
        disabled={busy || done}
        className="mt-4 rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Zerando sistema…" : done ? "Sistema zerado" : "Zerar sistema agora"}
      </button>
      {done && <p className="mt-3 text-sm text-green-700">Dados de demonstração removidos. Apenas seu usuário foi mantido.</p>}
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </section>
  );
}
