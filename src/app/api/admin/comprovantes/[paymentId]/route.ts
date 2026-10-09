import { z } from "zod";
import { requireFinancialUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { paymentProofPath, PAYMENT_PROOF_BUCKET } from "@/lib/uploads/payment-proof-format";
export async function GET(_request: Request, { params }: { params: Promise<{ paymentId: string }> }) {
  await requireFinancialUser();
  const { paymentId } = await params;
  if (!z.string().uuid().safeParse(paymentId).success) return new Response("Comprovante não encontrado.", { status: 404 });
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, select: { receipt_url: true } });
  if (!payment?.receipt_url) return new Response("Comprovante não encontrado.", { status: 404 });
  const path = paymentProofPath(payment.receipt_url);
  if (!path) return Response.redirect(payment.receipt_url);
  const { data, error } = await createSupabaseAdminClient().storage.from(PAYMENT_PROOF_BUCKET).download(path);
  if (error || !data) return new Response("Comprovante não encontrado.", { status: 404 });
  return new Response(await data.arrayBuffer(), { headers: { "Content-Type": data.type, "Content-Disposition": `inline; filename="comprovante.${path.split(".").pop()}"`, "Cache-Control": "private, no-store" } });
}
