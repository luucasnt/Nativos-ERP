import { documentFilename, documentDownloadRedirect } from "@/lib/documents/download";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireInternalUser } from "@/lib/auth/get-current-user";
import { loadReceiptData, ReceiptDocument } from "@/lib/documents/receipt";
import { pdfResponse, errorResponse } from "@/lib/documents/pdf-response";

export async function GET(request: Request, { params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;

  try {
    await requireInternalUser();
    const data = await loadReceiptData(paymentId);
    const filename = documentFilename("Recibo", data.passengerName, data.payment.finance_entry.reservation?.code ?? "Avulso", data.payment.created_at.toISOString().slice(0,19).replace(/[:T]/g, "-"));
    const redirect = documentDownloadRedirect(request, filename);
    if (redirect) return redirect;
    const buffer = await renderToBuffer(ReceiptDocument({ data }));
    return pdfResponse(buffer, filename);
  } catch (error) {
    return errorResponse(error);
  }
}
