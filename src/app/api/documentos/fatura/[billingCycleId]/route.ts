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
    return pdfResponse(buffer, `Fatura-${data.billingCycle.period}-${data.billingCycle.reservations.length === 1 ? data.billingCycle.reservations[0].reservation.code : billingCycleId.slice(0, 8)}.pdf`);
  } catch (error) {
    return errorResponse(error);
  }
}

