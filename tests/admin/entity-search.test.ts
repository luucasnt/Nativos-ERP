import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => ({ user: { account_type: "internal", status: "ativo" } as { account_type: string; status: string } | null }));
vi.mock("@/lib/auth/get-current-user", () => ({ getCurrentUser: async () => auth.user }));
import { GET } from "@/app/api/admin/search/route";
import { prisma } from "@/lib/prisma";
const token = crypto.randomUUID();
const ids: string[] = [];
beforeAll(async () => {
  for (let i = 0; i < 25; i++) {
    const c = await prisma.client.create({ data: { name: `AA ${token} ${String(i).padStart(2, "0")}`, phone: `phone-${token}`, email: `email-${token}@example.test`, document: `doc-${token}` } });
    ids.push(c.id);
  }
});
afterAll(async () => { await prisma.client.deleteMany({ where: { id: { in: ids } } }); });
async function search(q: string, entity = "client") {
  const response = await GET(new Request(`https://erp.test/api/admin/search?entity=${entity}&q=${encodeURIComponent(q)}`));
  return { response, data: await response.json() as { results: Array<{ value: string; type: string }> } };
}
describe("busca autorizada de cadastros", () => {
  it("lista clientes ao abrir o seletor vazio, com limite de resultados", async () => {
    const { response, data } = await search(""); expect(response.status).toBe(200);
    expect(data.results.length).toBe(20); expect(data.results.every((r) => r.type === "Cliente")).toBe(true);
    expect(data.results.some((r) => ids.includes(r.value))).toBe(true);
  });
  it("pesquisa desde uma letra", async () => { const { data } = await search("A"); expect(data.results.some((r) => ids.includes(r.value))).toBe(true); });
  it.each(["phone", "email", "doc"])("mantém a pesquisa por %s", async (field) => { const { data } = await search(`${field}-${token}`); expect(data.results).toHaveLength(20); expect(data.results.every((r) => ids.includes(r.value))).toBe(true); });
  it("mantém mínimo de duas letras para a busca global", async () => { const { data } = await search("A", ""); expect(data.results).toEqual([]); });
  it("recusa entidade inválida", async () => { const { response } = await search("", "unknown"); expect(response.status).toBe(400); });
  it("continua bloqueando acesso sem sessão, portal e usuário inativo", async () => {
    try {
      for (const user of [null, { account_type: "portal", status: "ativo" }, { account_type: "internal", status: "inativo" }]) {
        auth.user = user; expect((await search("")).response.status).toBe(401);
      }
    } finally { auth.user = { account_type: "internal", status: "ativo" }; }
  });
});
