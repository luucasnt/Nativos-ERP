import { documentFilename, documentDownloadRedirect } from "@/lib/documents/download";
import { renderToBuffer } from "@react-pdf/renderer";
import { assertCanAccessReservationDocument } from "@/lib/documents/auth";
import { loadVoucherData, VoucherDocument } from "@/lib/documents/voucher";
import { pdfResponse, errorResponse } from "@/lib/documents/pdf-response";

export async function GET(request: Request, { params }: { params: Promise<{ reservationId: string }> }) {
  const { reservationId } = await params;

  try {
    const user = await assertCanAccessReservationDocument(reservationId);
    const query = new URL(request.url).searchParams;
    const finance = query.get("financeiro");
    if (finance !== null && finance !== "sim" && finance !== "nao") {
      return new Response("Escolha uma opção válida para o resumo financeiro.", { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    if (finance !== null && user.account_type !== "internal") {
      throw new Error("Você não tem permissão para alterar a exibição financeira deste voucher.");
    }
    const data = await loadVoucherData(reservationId);
    if (finance !== null) data.showPrice = finance === "sim";
    const detail = finance === null ? undefined : finance === "sim" ? "Com-Resumo-Financeiro" : "Sem-Resumo-Financeiro";
    const filename = documentFilename("Voucher", data.reservation.client.name, data.reservation.code, detail);
    const redirect = documentDownloadRedirect(request, filename, finance === null ? undefined : new URLSearchParams({ financeiro: finance }));
    if (redirect) return redirect;
    const buffer = await renderToBuffer(VoucherDocument({ data }));
    return pdfResponse(buffer, filename);
  } catch (error) {
    return errorResponse(error);
  }
}
