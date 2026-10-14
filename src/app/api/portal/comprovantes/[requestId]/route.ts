import { REMITTANCE_TYPES, requestEntryIds } from "@/lib/finance/remittance-summary";
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
  if (!request || !REMITTANCE_TYPES.includes(request.type) || !(user.account_type === "internal" && canAccessFinance(user) || user.account_type === "portal" && user.linked_company_id === request.company_id && user.linked_company?.roles.includes("fornecedor"))) return new Response("Comprovante não encontrado.", { status: 404 });
  let receipt: string | null = null;
  if (request.type === "pagamento_repasse_fornecedor") {
    const details = supplierRemittanceSchema.safeParse(request.allocation_details);
    if (!details.success) return new Response("Comprovante não encontrado.", { status: 404 });
    const ownedPath = paymentProofPath(details.data.receipt_url);
    if (!ownedPath || !ownedPath.startsWith(`${details.data.submitted_by_id}/`)) return new Response("Comprovante não encontrado.", { status: 404 });
    receipt = details.data.receipt_url;
  } else {
    const details = request.allocation_details as Record<string, unknown> | null;
    const paymentIds = Array.isArray(details?.payment_ids) ? details.payment_ids.filter((v): v is string => typeof v === "string" && z.string().uuid().safeParse(v).success) : [];
    const payment = paymentIds.length ? await prisma.payment.findFirst({ where: { id: { in: paymentIds }, finance_entry_id: { in: requestEntryIds(request.allocation_details) }, finance_entry: { party_type: "fornecedor", party_id: request.company_id }, reversed_at: null, estorno_of_id: null }, orderBy: { created_at: "desc" }, select: { receipt_url: true } }) : null;
    receipt = payment?.receipt_url ?? null;
  }
  if (!receipt) return new Response("Comprovante não encontrado.", { status: 404 });
  const path = paymentProofPath(receipt);
  if (!path) { const url = new URL(receipt); return ["https:", "http:"].includes(url.protocol) ? Response.redirect(url) : new Response("Comprovante inválido.", { status: 404 }); }
  const { data, error } = await createSupabaseAdminClient().storage.from(PAYMENT_PROOF_BUCKET).download(path);
  if (error || !data) return new Response("Comprovante não encontrado.", { status: 404 });
  return new Response(await data.arrayBuffer(), { headers: { "Content-Type": data.type, "Content-Disposition": `inline; filename="comprovante-${request.protocol}.${path.split(".").pop()}"`, "Cache-Control": "private, no-store" } });
}
