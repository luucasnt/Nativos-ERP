import { renderToBuffer } from "@react-pdf/renderer";
import { assertCanAccessBillingCycleDocument } from "@/lib/documents/auth";
import { InvoiceDocument, loadInvoiceData } from "@/lib/documents/invoice";
import { errorResponse, pdfResponse } from "@/lib/documents/pdf-response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ billingCycleId: string }> },
) {
  const { billingCycleId } = await params;

  try {
    await assertCanAccessBillingCycleDocument(billingCycleId);
    const data = await loadInvoiceData(billingCycleId);
    const buffer = await renderToBuffer(InvoiceDocument({ data }));
    return pdfResponse(buffer, "fatura-" + data.billingCycle.period + ".pdf");
  } catch (error) {
    return errorResponse(error);
  }
}

