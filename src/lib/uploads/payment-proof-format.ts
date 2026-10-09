export const PAYMENT_PROOF_BUCKET = "payment-receipts";
export const MAX_PROOF_SIZE = 4 * 1024 * 1024;
export const PROOF_PREFIX = `storage://${PAYMENT_PROOF_BUCKET}/`;
export function paymentProofPath(value: string) {
  if (!value.startsWith(PROOF_PREFIX)) return null;
  const path = value.slice(PROOF_PREFIX.length);
  if (!/^[a-f0-9-]{36}\/[a-f0-9-]{36}\.(pdf|jpg|png|webp)$/.test(path)) throw new Error("Comprovante inválido.");
  return path;
}
export function detectProofType(bytes: Uint8Array) {
  if (!bytes.length || bytes.length > MAX_PROOF_SIZE) throw new Error("O comprovante deve ter até 4 MB.");
  if (Buffer.from(bytes.subarray(0, 5)).toString() === "%PDF-") return { extension: "pdf", mime: "application/pdf" };
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { extension: "jpg", mime: "image/jpeg" };
  if (Buffer.from(bytes.subarray(0, 8)).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return { extension: "png", mime: "image/png" };
  if (Buffer.from(bytes.subarray(0, 4)).toString() === "RIFF" && Buffer.from(bytes.subarray(8, 12)).toString() === "WEBP") return { extension: "webp", mime: "image/webp" };
  throw new Error("Anexe um PDF ou imagem JPG, PNG ou WebP.");
}
