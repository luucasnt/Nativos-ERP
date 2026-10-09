import { beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const auth = vi.hoisted(() => ({ id: "", authorized: true }));
vi.mock("@/lib/auth/get-current-user", () => ({ requireInternalUser: async () => { if (!auth.authorized) throw new Error("Não autorizado"); return { id: auth.id }; }, getCurrentUser: async () => ({ account_type: "internal", status: "ativo" }) }));
vi.mock("next/navigation", () => ({ redirect: () => { throw new Error("REDIRECT"); } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { createClient, updateClient } from "@/app/admin/clientes/actions";
import { GET } from "@/app/api/admin/search/route";
import { prisma } from "@/lib/prisma";
beforeAll(async () => { auth.id = (await prisma.user.create({ data: { auth_user_id: crypto.randomUUID(), email: `${crypto.randomUUID()}@example.test`, account_type: "internal", role: "admin" } })).id; });
function form(name: string, vip: boolean) { const f = new FormData(); f.set("name", name); f.set("origin", "proprio"); if (vip) f.set("is_vip", "on"); return f; }
describe("cliente VIP na equipe interna", () => {
  it("cria VIP, aparece na busca, permite desmarcar e registra as alterações", async () => {
    const name = `VIP-${crypto.randomUUID()}`;
    await expect(createClient({ error: null }, form(name, true))).rejects.toThrow("REDIRECT");
    const client = await prisma.client.findFirstOrThrow({ where: { name } }); expect(client.is_vip).toBe(true);
    const data = await (await GET(new Request(`https://erp.test/api/admin/search?entity=client&q=${name}`))).json();
    expect(data.results[0].description).toContain("VIP"); expect(data.results[0].title).toBe(name);
    await expect(updateClient(client.id, { error: null }, form(name, false))).rejects.toThrow("REDIRECT");
    expect((await prisma.client.findUniqueOrThrow({ where: { id: client.id } })).is_vip).toBe(false);
    expect(await prisma.auditLog.count({ where: { entity_type: "client", entity_id: client.id } })).toBe(2);
    auth.authorized = false;
    try { await expect(updateClient(client.id, { error: null }, form(name, true))).rejects.toThrow("Não autorizado"); }
    finally { auth.authorized = true; }
    expect((await prisma.client.findUniqueOrThrow({ where: { id: client.id } })).is_vip).toBe(false);
  });
});
