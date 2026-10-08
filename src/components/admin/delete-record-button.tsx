"use client";

import { useState } from "react";

export function DeleteRecordButton({ id, label, action }: { id: string; label: string; action: (id: string) => Promise<{ error?: string | null }> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!window.confirm(`Excluir definitivamente ${label}? Esta ação não pode ser desfeita.`)) return;
    setBusy(true);
    setError(null);
    try {
      const result = await action(id);
      if (result?.error) setError(result.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível excluir este registro.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="mt-4">
    <button type="button" onClick={remove} disabled={busy} className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">
      {busy ? "Excluindo…" : "Excluir registro"}
    </button>
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
  </div>;
}
