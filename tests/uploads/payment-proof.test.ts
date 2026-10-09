import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const upload = vi.hoisted(() => vi.fn(async () => ({ error: null })));
const info = vi.hoisted(() => vi.fn(async () => ({ error: null })));
const auth = vi.hoisted(() => ({ allowed: true, id: "11111111-1111-1111-1111-111111111111" }));
vi.mock("@/lib/auth/get-current-user", () => ({ requireFinancialUser: async () => { if (!auth.allowed) throw new Error("Sem permissão"); return { id: auth.id }; } }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: () => ({ storage: { from: () => ({ upload, info }) } }) }));
import { POST } from "@/app/api/admin/comprovantes/route";
import { validatePaymentProof } from "@/lib/uploads/payment-proof";
import { detectProofType, MAX_PROOF_SIZE, PROOF_PREFIX } from "@/lib/uploads/payment-proof-format";
const request = (file: File, origin = "http://localhost") => { const form = new FormData(); form.set("file", file); return new Request("http://localhost/api/admin/comprovantes", { method: "POST", body: form, headers: { origin } }); };
describe("comprovante privado", () => {
  it("identifica PDF e imagens pelos bytes, rejeita HTML e arquivos grandes", () => {
    expect(detectProofType(Buffer.from("%PDF-1.7 test")).mime).toBe("application/pdf");
    expect(detectProofType(new Uint8Array([255,216,255,0])).extension).toBe("jpg");
    expect(() => detectProofType(Buffer.from("<html>"))).toThrow(/PDF/);
    expect(() => detectProofType(new Uint8Array(MAX_PROOF_SIZE + 1))).toThrow(/4 MB/);
  });
  it("envia arquivo com nome gerado, guarda caminho privado e verifica o proprietário", async () => {
    const response = await POST(request(new File(["%PDF-1.7 test"], "comprovante.pdf", { type: "application/pdf" })));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.receiptUrl).toMatch(/^storage:\/\/payment-receipts\//);
    expect(upload).toHaveBeenCalledWith(expect.stringContaining(auth.id), expect.any(Uint8Array), { contentType: "application/pdf", upsert: false });
    expect(await validatePaymentProof(data.receiptUrl, auth.id)).toBe(data.receiptUrl);
    await expect(validatePaymentProof(data.receiptUrl, "outro-usuario")).rejects.toThrow(/por você/);
  });
  it("nega usuário não financeiro, origem externa e conteúdo disfarçado", async () => {
    upload.mockClear(); auth.allowed = false;
    expect((await POST(request(new File(["%PDF-test"], "a.pdf")))).status).toBe(400);
    auth.allowed = true;
    expect((await POST(request(new File(["%PDF-test"], "a.pdf"), "https://evil.test"))).status).toBe(403);
    expect((await POST(request(new File(["<html>"], "a.pdf", { type: "application/pdf" })))).status).toBe(400);
    expect(upload).not.toHaveBeenCalled();
  });
  it("preserva referências antigas e rejeita travessia de diretórios", async () => {
    expect(await validatePaymentProof("https://example.test/old.pdf", auth.id)).toBe("https://example.test/old.pdf");
    await expect(validatePaymentProof(PROOF_PREFIX + "../a.pdf", auth.id)).rejects.toThrow(/inválido/);
  });
});
