// Smoke test de verdade: gera cada um dos 5 documentos + a plaquinha em
// PDF real contra dados já existentes no banco de seed, só para provar
// que renderToBuffer não lança (fontes carregam, o layout não quebra).
// Não valida o conteúdo visual — isso é revisão humana do PDF gerado.
import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { PrismaClient } from "@prisma/client";
import { loadVoucherData, VoucherDocument } from "@/lib/documents/voucher";
import { loadWorkOrderData, WorkOrderDocument } from "@/lib/documents/work-order";
import { loadQuoteData, QuoteDocument } from "@/lib/documents/quote";
import { loadContractData, ContractDocument } from "@/lib/documents/contract";
import { loadReceiptData, ReceiptDocument } from "@/lib/documents/receipt";
import { loadReceptionSignData, ReceptionSignDocument } from "@/lib/documents/reception-sign";

const prisma = new PrismaClient();

const RESERVATION_ID = "50000000-0000-0000-0000-000000000001";
const SERVICE_ID = "60000000-0000-0000-0000-000000000001";

function isPdf(buffer: Buffer) {
  return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
}

describe("geração de PDF (smoke test contra dados reais de seed)", () => {
  it("voucher", async () => {
    const data = await loadVoucherData(RESERVATION_ID);
    const buffer = await renderToBuffer(VoucherDocument({ data }));
    expect(isPdf(buffer)).toBe(true);
  });

  it("ordem de serviço", async () => {
    const data = await loadWorkOrderData(SERVICE_ID);
    const buffer = await renderToBuffer(WorkOrderDocument({ data }));
    expect(isPdf(buffer)).toBe(true);
  });

  it("orçamento", async () => {
    const data = await loadQuoteData(RESERVATION_ID);
    const buffer = await renderToBuffer(QuoteDocument({ data }));
    expect(isPdf(buffer)).toBe(true);
  });

  it("contrato", async () => {
    const data = await loadContractData(RESERVATION_ID);
    const buffer = await renderToBuffer(ContractDocument({ data }));
    expect(isPdf(buffer)).toBe(true);
  });

  it("recibo", async () => {
    const payment = await prisma.payment.findFirstOrThrow();
    const data = await loadReceiptData(payment.id);
    const buffer = await renderToBuffer(ReceiptDocument({ data }));
    expect(isPdf(buffer)).toBe(true);
  });

  it("plaquinha de recepção", async () => {
    const service = await prisma.service.create({
      data: {
        reservation_id: RESERVATION_ID,
        type: "transfer_chegada",
        execution_type: "propria",
        original_price: 100,
        price: 100,
        reception_sign_enabled: true,
        reception_passenger_name: "Família Andrade",
      },
    });

    try {
      const data = await loadReceptionSignData(service.id);
      const buffer = await renderToBuffer(ReceptionSignDocument({ data }));
      expect(isPdf(buffer)).toBe(true);
    } finally {
      await prisma.service.delete({ where: { id: service.id } }).catch(() => {});
    }
  });
});
