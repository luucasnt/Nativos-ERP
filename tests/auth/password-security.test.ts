import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { assertPasswordNotLeaked } from "@/lib/auth/password-security";
const password = "example-test-only-strong-password";
const hash = createHash("sha1").update(password).digest("hex").toUpperCase();
describe("verificação de senha com privacidade", () => {
  it("envia somente prefixo de hash e padding, nunca a senha ou hash completo", async () => { const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(`${hash.slice(5)}:0\r\n${"A".repeat(35)}:20`)); await assertPasswordNotLeaked(password, request); const [url, options] = request.mock.calls[0]; expect(url).toBe(`https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`); expect(JSON.stringify(request.mock.calls)).not.toContain(password); expect(JSON.stringify(request.mock.calls)).not.toContain(hash); expect(options?.headers).toMatchObject({ "Add-Padding": "true" }); });
  it("rejeita senha vazada", async () => { const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(`${hash.slice(5)}:12`)); await expect(assertPasswordNotLeaked(password, request)).rejects.toThrow(/vazamentos/); });
  it("não aceita senha sem verificação quando o serviço falha", async () => { const request = vi.fn<typeof fetch>().mockRejectedValue(new Error("Network")); await expect(assertPasswordNotLeaked(password, request)).rejects.toThrow(/Tente novamente/); });
  it("rejeita resposta inválida", async () => { const request = vi.fn<typeof fetch>().mockResolvedValue(new Response("Invalid")); await expect(assertPasswordNotLeaked(password, request)).rejects.toThrow(/Tente novamente/); });
});
