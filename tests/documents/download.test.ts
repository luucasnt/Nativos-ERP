import { describe, expect, it } from "vitest";
import { pdfResponse } from "@/lib/documents/pdf-response";
describe("download privado dos documentos", () => {
  it("envia PDF como anexo com código e evita nomes inseguros", async () => {
    const response = pdfResponse(Buffer.from("%PDF-test"), "Voucher-NAT-123.pdf");
    expect(response.headers.get("Content-Disposition")).toContain('attachment; filename="Voucher-NAT-123.pdf"');
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(await response.text()).toBe("%PDF-test");
    expect(pdfResponse(Buffer.from("pdf"), 'arquivo"\r\n.pdf').headers.get("Content-Disposition")).not.toContain("\r");
  });
});
