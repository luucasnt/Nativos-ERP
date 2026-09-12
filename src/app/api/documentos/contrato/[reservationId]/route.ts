import { renderToBuffer } from "@react-pdf/renderer";
import { requireInternalUser } from "@/lib/auth/get-current-user";
import { loadContractData, ContractDocument } from "@/lib/documents/contract";
import { pdfResponse, errorResponse } from "@/lib/documents/pdf-response";

export async function GET(_request: Request, { params }: { params: Promise<{ reservationId: string }> }) {
  const { reservationId } = await params;

  try {
    await requireInternalUser();
    const data = await loadContractData(reservationId);
    const buffer = await renderToBuffer(ContractDocument({ data }));
    return pdfResponse(buffer, `contrato-${data.reservation.code}.pdf`);
  } catch (error) {
    return errorResponse(error);
  }
}
