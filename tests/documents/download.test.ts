import { describe, expect, it } from "vitest";
import { documentFilename, documentDownloadRedirect } from "@/lib/documents/download";
import { pdfResponse } from "@/lib/documents/pdf-response";
describe("download privado dos documentos", () => {
  it("identifica o arquivo e o caminho usados pelo iPhone sem perder a reserva", () => {
    const filename = documentFilename("Voucher", "João da Silva", "RES-2026-000123");
    expect(filename).toBe("Nativos-Voucher-Joao-da-Silva-RES-2026-000123.pdf");
    const first = documentDownloadRedirect(new Request("https://example.test/api/documentos/voucher/id"), filename)!;
    expect(first.status).toBe(307);
    expect(first.headers.get("Location")).toBe("https://example.test/api/documentos/voucher/id/" + filename);
    expect(documentDownloadRedirect(new Request(first.headers.get("Location")!), filename)).toBeNull();
    expect(documentFilename("OS", 'A/B\r\n"', "RES-123")).not.toContain("/");
  });
  it("envia PDF como anexo com código e evita nomes inseguros", async () => {
    const response = pdfResponse(Buffer.from("%PDF-test"), "Voucher-NAT-123.pdf");
    expect(response.headers.get("Content-Disposition")).toContain('attachment; filename="Voucher-NAT-123.pdf"');
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(await response.text()).toBe("%PDF-test");
    expect(pdfResponse(Buffer.from("pdf"), 'arquivo"\r\n.pdf').headers.get("Content-Disposition")).not.toContain("\r");
  });
});
