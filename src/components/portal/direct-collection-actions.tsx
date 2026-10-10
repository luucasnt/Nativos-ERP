"use client";

import { useState, useTransition } from "react";
import { buttonClass, inputClass, secondaryButtonClass } from "@/lib/ui";

type ReasonOption = { id: string; label: string };

type DirectCollectionActionsProps = {
  uploadEndpoint?: string;
  serviceId: string;
  reasons: ReasonOption[];
  onConfirmReceived: (serviceId: string, receiptUrl: string) => Promise<{ error: string | null }>;
  onConfirmNotReceived: (serviceId: string, reasonId: string) => Promise<{ error: string | null }>;
};

export function DirectCollectionActions({
  uploadEndpoint,
  serviceId,
  reasons,
  onConfirmReceived,
  onConfirmNotReceived,
}: DirectCollectionActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showNotReceived, setShowNotReceived] = useState(false);
  const [reasonId, setReasonId] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState("");

  return (
    <div className="flex w-full flex-col items-stretch gap-2 sm:items-end">
      <div className="grid gap-2 sm:flex">
        {uploadEndpoint ? <label className="grid gap-1 text-xs">Comprovante do recebimento (imagem ou PDF)<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={isPending || uploading} className={`${inputClass} text-sm`} onChange={async event => { const file = event.target.files?.[0]; setReceiptUrl(""); setError(null); if (!file) return; setUploading(true); try { const body = new FormData(); body.set("file", file); const response = await fetch(uploadEndpoint, { method: "POST", body }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Falha ao anexar comprovante."); setReceiptUrl(data.receiptUrl); } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao anexar."); } finally { setUploading(false); } }} />{receiptUrl && <span className="text-success">Comprovante anexado.</span>}</label> : <input value={receiptUrl} onChange={(event) => setReceiptUrl(event.target.value)} className={`${inputClass} text-sm`} placeholder="Link do comprovante obrigatório" type="url" aria-label="Comprovante do recebimento" required />}
        <button
          type="button"
          disabled={isPending || uploading}
          onClick={() =>
            startTransition(async () => {
              setSuccess(null);
              const result = await onConfirmReceived(serviceId, receiptUrl);
              setError(result.error);
              if (!result.error) setSuccess("Recebimento confirmado.");
            })
          }
          className={`${buttonClass} px-3 py-1 text-sm`}
        >
          {uploading ? "Anexando..." : "Recebi o valor"}
        </button>
        <button
          type="button"
          disabled={isPending || uploading}
          onClick={() => setShowNotReceived((v) => !v)}
          className={`${secondaryButtonClass} px-3 py-1 text-sm`}
        >
          Não recebi
        </button>
      </div>
      {showNotReceived && (
        <div className="grid gap-2 sm:flex">
          <select
            value={reasonId}
            onChange={(e) => setReasonId(e.target.value)}
            className={`${inputClass} text-sm`}
          >
            <option value="">Motivo…</option>
            {reasons.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={isPending || uploading}
            onClick={() =>
              startTransition(async () => {
                setSuccess(null);
                const result = await onConfirmNotReceived(serviceId, reasonId);
                setError(result.error);
                if (!result.error) setSuccess("Ocorrência registrada.");
              })
            }
            className={`${secondaryButtonClass} px-3 py-1 text-sm`}
          >
            Confirmar
          </button>
        </div>
      )}
      {error && <span role="alert" className="text-sm text-red-700">{error}</span>}
      {success && <span role="status" className="text-sm text-success">{success}</span>}
    </div>
  );
}
