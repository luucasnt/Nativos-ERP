import { z } from "zod";
import { assertActiveUser, canAccessFinance } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { paymentProofPath, PAYMENT_PROOF_BUCKET } from "@/lib/uploads/payment-proof-format";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await assertActiveUser(); const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return new Response("Comprovante não encontrado.", { status: 404 });
  const receipt = await prisma.directCollection.findUnique({ where: { id }, include: { service: { select: { supplier_id: true, reservation: { select: { code: true } } } } } });
  if (!receipt || receipt.reversed_at || receipt.customer_amount === null || receipt.receiver_type !== "fornecedor" || receipt.financial_responsible_id !== receipt.service.supplier_id || !receipt.receipt_url || !(user.account_type === "internal" && canAccessFinance(user) || user.account_type === "portal" && user.linked_company_id === receipt.financial_responsible_id && user.linked_company?.roles.includes("fornecedor"))) return new Response("Comprovante não encontrado.", { status: 404 });
  const path = paymentProofPath(receipt.receipt_url);
  if (!path) { const url = new URL(receipt.receipt_url); return ["http:", "https:"].includes(url.protocol) ? Response.redirect(url) : new Response("Comprovante inválido.", { status: 404 }); }
  const { data, error } = await createSupabaseAdminClient().storage.from(PAYMENT_PROOF_BUCKET).download(path);
  if (error || !data) return new Response("Comprovante não encontrado.", { status: 404 });
  const code = receipt.service.reservation.code.replace(/[^a-zA-Z0-9-]/g, "-");
  return new Response(await data.arrayBuffer(), { headers: { "Content-Type": data.type, "Content-Disposition": `inline; filename="recebimento-passageiro-${code}.${path.split(".").pop()}"`, "Cache-Control": "private, no-store" } });
}
