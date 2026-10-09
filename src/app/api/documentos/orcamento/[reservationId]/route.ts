import { documentFilename, documentDownloadRedirect } from "@/lib/documents/download";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireInternalUser } from "@/lib/auth/get-current-user";
import { loadQuoteData, QuoteDocument } from "@/lib/documents/quote";
import { pdfResponse, errorResponse } from "@/lib/documents/pdf-response";

export async function GET(request: Request, { params }: { params: Promise<{ reservationId: string }> }) {
  const { reservationId } = await params;

  try {
    await requireInternalUser();
    const data = await loadQuoteData(reservationId);
    const filename = documentFilename("Orcamento", data.reservation.client.name, data.reservation.code);
    const redirect = documentDownloadRedirect(request, filename);
    if (redirect) return redirect;
    const buffer = await renderToBuffer(QuoteDocument({ data }));
    return pdfResponse(buffer, filename);
  } catch (error) {
    return errorResponse(error);
  }
}
