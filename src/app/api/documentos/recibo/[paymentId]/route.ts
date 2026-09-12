import { renderToBuffer } from "@react-pdf/renderer";
import { requireInternalUser } from "@/lib/auth/get-current-user";
import { loadReceiptData, ReceiptDocument } from "@/lib/documents/receipt";
import { pdfResponse, errorResponse } from "@/lib/documents/pdf-response";

export async function GET(_request: Request, { params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;

  try {
    await requireInternalUser();
    const data = await loadReceiptData(paymentId);
    const buffer = await renderToBuffer(ReceiptDocument({ data }));
    return pdfResponse(buffer, `recibo-${data.payment.id.slice(0, 8)}.pdf`);
  } catch (error) {
    return errorResponse(error);
  }
}
