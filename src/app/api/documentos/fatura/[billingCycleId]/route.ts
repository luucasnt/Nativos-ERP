import { documentFilename, documentDownloadRedirect } from "@/lib/documents/download";
import { renderToBuffer } from "@react-pdf/renderer";
import { assertCanAccessBillingCycleDocument } from "@/lib/documents/auth";
import { InvoiceDocument, loadInvoiceData } from "@/lib/documents/invoice";
import { errorResponse, pdfResponse } from "@/lib/documents/pdf-response";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ billingCycleId: string }> },
) {
  const { billingCycleId } = await params;

  try {
    await assertCanAccessBillingCycleDocument(billingCycleId);
    const data = await loadInvoiceData(billingCycleId);
    const filename = documentFilename("Fatura", data.billingCycle.reservations.length === 1 ? data.billingCycle.reservations[0].reservation.client.name : data.billingCycle.company.name, data.billingCycle.reservations.map(item => item.reservation.code).slice(0,3).join("-") || "Consolidada", data.billingCycle.period);
    const redirect = documentDownloadRedirect(request, filename);
    if (redirect) return redirect;
    const buffer = await renderToBuffer(InvoiceDocument({ data }));
    return pdfResponse(buffer, filename);
  } catch (error) {
    return errorResponse(error);
  }
}

