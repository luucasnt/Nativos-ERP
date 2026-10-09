import { documentFilename, documentDownloadRedirect } from "@/lib/documents/download";
import { renderToBuffer } from "@react-pdf/renderer";
import { assertCanAccessServiceDocument } from "@/lib/documents/auth";
import { loadWorkOrderData, WorkOrderDocument } from "@/lib/documents/work-order";
import { pdfResponse, errorResponse } from "@/lib/documents/pdf-response";

export async function GET(request: Request, { params }: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = await params;

  try {
    await assertCanAccessServiceDocument(serviceId);
    const data = await loadWorkOrderData(serviceId);
    const filename = documentFilename("OS", data.service.reception_passenger_name || data.service.reservation.client.name, data.service.reservation.code, [data.service.type, data.service.scheduled_date?.toISOString().slice(0,10), data.service.scheduled_time?.replace(":", "h")].filter(Boolean).join("-"));
    const redirect = documentDownloadRedirect(request, filename);
    if (redirect) return redirect;
    const buffer = await renderToBuffer(WorkOrderDocument({ data }));
    return pdfResponse(buffer, filename);
  } catch (error) {
    return errorResponse(error);
  }
}
