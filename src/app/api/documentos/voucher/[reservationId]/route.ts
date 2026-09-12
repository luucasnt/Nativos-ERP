import { renderToBuffer } from "@react-pdf/renderer";
import { assertCanAccessReservationDocument } from "@/lib/documents/auth";
import { loadVoucherData, VoucherDocument } from "@/lib/documents/voucher";
import { pdfResponse, errorResponse } from "@/lib/documents/pdf-response";

export async function GET(_request: Request, { params }: { params: Promise<{ reservationId: string }> }) {
  const { reservationId } = await params;

  try {
    await assertCanAccessReservationDocument(reservationId);
    const data = await loadVoucherData(reservationId);
    const buffer = await renderToBuffer(VoucherDocument({ data }));
    return pdfResponse(buffer, `voucher-${data.reservation.code}.pdf`);
  } catch (error) {
    return errorResponse(error);
  }
}
