import { assertActiveCompanyPortalUser } from "@/lib/auth/get-current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { detectProofType, MAX_PROOF_SIZE, PAYMENT_PROOF_BUCKET, PROOF_PREFIX } from "@/lib/uploads/payment-proof-format";
export async function POST(request: Request) {
  try {
    const user = await assertActiveCompanyPortalUser();
    if (!user.linked_company.roles.includes("fornecedor")) throw new Error("Acesso restrito ao fornecedor.");
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Origem inválida." }, { status: 403 });
    if (Number(request.headers.get("content-length")) > MAX_PROOF_SIZE + 65536) return Response.json({ error: "O comprovante deve ter até 4 MB." }, { status: 413 });
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size > MAX_PROOF_SIZE) throw new Error("Selecione um comprovante de até 4 MB.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = detectProofType(bytes);
    const path = `${user.id}/${crypto.randomUUID()}.${type.extension}`;
    const { error } = await createSupabaseAdminClient().storage.from(PAYMENT_PROOF_BUCKET).upload(path, bytes, { contentType: type.mime, upsert: false });
    if (error) throw new Error("Não foi possível anexar o comprovante. Tente novamente.");
    return Response.json({ receiptUrl: PROOF_PREFIX + path });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Falha ao anexar comprovante." }, { status: 400 });
  }
}
