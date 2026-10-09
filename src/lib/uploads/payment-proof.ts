import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { PAYMENT_PROOF_BUCKET, paymentProofPath } from "./payment-proof-format";
export async function validatePaymentProof(value: string | undefined, actorId: string) {
  if (!value?.trim()) return null;
  const proof = value.trim();
  const path = paymentProofPath(proof);
  if (!path) {
    // Mantém referências antigas válidas; a interface usa somente anexos.
    const url = new URL(proof);
    if (!["https:", "http:"].includes(url.protocol)) throw new Error("Comprovante inválido.");
    return proof;
  }
  if (!path.startsWith(`${actorId}/`)) throw new Error("Anexe um comprovante enviado por você.");
  const { error } = await createSupabaseAdminClient().storage.from(PAYMENT_PROOF_BUCKET).info(path);
  if (error) throw new Error("O comprovante não foi localizado. Anexe o arquivo novamente.");
  return proof;
}
