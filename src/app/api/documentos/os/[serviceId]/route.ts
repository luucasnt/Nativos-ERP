import { renderToBuffer } from "@react-pdf/renderer";
import { assertCanAccessServiceDocument } from "@/lib/documents/auth";
import { loadWorkOrderData, WorkOrderDocument } from "@/lib/documents/work-order";
import { pdfResponse, errorResponse } from "@/lib/documents/pdf-response";

export async function GET(_request: Request, { params }: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = await params;

  try {
    await assertCanAccessServiceDocument(serviceId);
    const data = await loadWorkOrderData(serviceId);
    const buffer = await renderToBuffer(WorkOrderDocument({ data }));
    return pdfResponse(buffer, `os-${data.service.id.slice(0, 8)}.pdf`);
  } catch (error) {
    return errorResponse(error);
  }
}
