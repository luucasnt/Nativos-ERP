import { documentFilename, documentDownloadRedirect } from "@/lib/documents/download";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireInternalUser } from "@/lib/auth/get-current-user";
import { loadContractData, ContractDocument } from "@/lib/documents/contract";
import { pdfResponse, errorResponse } from "@/lib/documents/pdf-response";

export async function GET(request: Request, { params }: { params: Promise<{ reservationId: string }> }) {
  const { reservationId } = await params;

  try {
    await requireInternalUser();
    const data = await loadContractData(reservationId);
    const filename = documentFilename("Contrato", data.reservation.client.name, data.reservation.code);
    const redirect = documentDownloadRedirect(request, filename);
    if (redirect) return redirect;
    const buffer = await renderToBuffer(ContractDocument({ data }));
    return pdfResponse(buffer, filename);
  } catch (error) {
    return errorResponse(error);
  }
}
