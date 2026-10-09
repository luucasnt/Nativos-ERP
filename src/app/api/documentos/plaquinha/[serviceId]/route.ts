import { documentFilename, documentDownloadRedirect } from "@/lib/documents/download";
import { renderToBuffer } from "@react-pdf/renderer";
import { assertCanAccessServiceDocument } from "@/lib/documents/auth";
import { loadReceptionSignData, ReceptionSignDocument } from "@/lib/documents/reception-sign";
import { pdfResponse, errorResponse } from "@/lib/documents/pdf-response";

export async function GET(request: Request, { params }: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = await params;

  try {
    await assertCanAccessServiceDocument(serviceId);
    const data = await loadReceptionSignData(serviceId);
    const filename = documentFilename("Plaquinha", data.passengerName, data.reservationCode);
    const redirect = documentDownloadRedirect(request, filename);
    if (redirect) return redirect;
    const buffer = await renderToBuffer(ReceptionSignDocument({ data }));
    return pdfResponse(buffer, filename);
  } catch (error) {
    return errorResponse(error);
  }
}
