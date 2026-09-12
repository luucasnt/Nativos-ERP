import { renderToBuffer } from "@react-pdf/renderer";
import { requireInternalUser } from "@/lib/auth/get-current-user";
import { loadReceptionSignData, ReceptionSignDocument } from "@/lib/documents/reception-sign";
import { pdfResponse, errorResponse } from "@/lib/documents/pdf-response";

export async function GET(_request: Request, { params }: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = await params;

  try {
    await requireInternalUser();
    const data = await loadReceptionSignData(serviceId);
    const buffer = await renderToBuffer(ReceptionSignDocument({ data }));
    return pdfResponse(buffer, "plaquinha.pdf");
  } catch (error) {
    return errorResponse(error);
  }
}
