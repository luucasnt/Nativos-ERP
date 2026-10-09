import { documentFilename, documentDownloadRedirect } from "@/lib/documents/download";
import { renderToBuffer } from "@react-pdf/renderer";
import { assertCanAccessReservationDocument } from "@/lib/documents/auth";
import { loadVoucherData, VoucherDocument } from "@/lib/documents/voucher";
import { pdfResponse, errorResponse } from "@/lib/documents/pdf-response";

export async function GET(request: Request, { params }: { params: Promise<{ reservationId: string }> }) {
  const { reservationId } = await params;

  try {
    await assertCanAccessReservationDocument(reservationId);
    const data = await loadVoucherData(reservationId);
    const filename = documentFilename("Voucher", data.reservation.client.name, data.reservation.code);
    const redirect = documentDownloadRedirect(request, filename);
    if (redirect) return redirect;
    const buffer = await renderToBuffer(VoucherDocument({ data }));
    return pdfResponse(buffer, filename);
  } catch (error) {
    return errorResponse(error);
  }
}
