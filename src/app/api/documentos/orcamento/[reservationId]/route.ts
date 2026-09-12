import { renderToBuffer } from "@react-pdf/renderer";
import { requireInternalUser } from "@/lib/auth/get-current-user";
import { loadQuoteData, QuoteDocument } from "@/lib/documents/quote";
import { pdfResponse, errorResponse } from "@/lib/documents/pdf-response";

export async function GET(_request: Request, { params }: { params: Promise<{ reservationId: string }> }) {
  const { reservationId } = await params;

  try {
    await requireInternalUser();
    const data = await loadQuoteData(reservationId);
    const buffer = await renderToBuffer(QuoteDocument({ data }));
    return pdfResponse(buffer, `orcamento-${data.reservation.code}.pdf`);
  } catch (error) {
    return errorResponse(error);
  }
}
