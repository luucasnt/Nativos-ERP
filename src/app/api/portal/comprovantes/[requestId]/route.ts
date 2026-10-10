import { z } from "zod";
import { assertActiveUser, canAccessFinance } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { paymentProofPath, PAYMENT_PROOF_BUCKET } from "@/lib/uploads/payment-proof-format";
import { supplierRemittanceSchema } from "@/lib/change-requests/supplier-workflows";
export async function GET(_request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const user = await assertActiveUser(); const { requestId } = await params;
  if (!z.string().uuid().safeParse(requestId).success) return new Response("Comprovante não encontrado.", { status: 404 });
  const request = await prisma.changeRequest.findUnique({ where: { id: requestId } });
  if (!request || request.type !== "pagamento_repasse_fornecedor" || !(user.account_type === "internal" && canAccessFinance(user) || user.account_type === "portal" && user.linked_company_id === request.company_id && user.linked_company?.roles.includes("fornecedor"))) return new Response("Comprovante não encontrado.", { status: 404 });
  const details = supplierRemittanceSchema.safeParse(request.allocation_details);
  if (!details.success) return new Response("Comprovante não encontrado.", { status: 404 });
  const path = paymentProofPath(details.data.receipt_url);
  if (!path || !path.startsWith(`${details.data.submitted_by_id}/`)) return new Response("Comprovante não encontrado.", { status: 404 });
  const { data, error } = await createSupabaseAdminClient().storage.from(PAYMENT_PROOF_BUCKET).download(path);
  if (error || !data) return new Response("Comprovante não encontrado.", { status: 404 });
  return new Response(await data.arrayBuffer(), { headers: { "Content-Type": data.type, "Content-Disposition": `inline; filename="comprovante-${request.protocol}.${path.split(".").pop()}"`, "Cache-Control": "private, no-store" } });
}
