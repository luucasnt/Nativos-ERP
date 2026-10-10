import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@/lib/prisma", () => ({ prisma: { user: { create: vi.fn(), findUniqueOrThrow: vi.fn() } } }));
import { prisma } from "@/lib/prisma";
import { createPortalUserWithClient, syncAppMetadataWithClient } from "@/lib/auth/provisioning-core";
beforeEach(() => vi.clearAllMocks());
function admin() { return { auth: { admin: { createUser: vi.fn(async () => ({ data: { user: { id: "new-auth" } }, error: null })), deleteUser: vi.fn(async () => ({ error: null })), updateUserById: vi.fn(async () => ({ error: null })) } } }; }
it("falha de vínculo não deixa o Auth recém-criado sem motorista/empresa", async () => {
  const client = admin(); vi.mocked(prisma.user.create).mockRejectedValueOnce(new Error("Vínculo duplicado"));
  await expect(createPortalUserWithClient(client as unknown as Parameters<typeof createPortalUserWithClient>[0], { email: "driver@test.local", linkedDriverId: crypto.randomUUID() })).rejects.toThrow("Vínculo duplicado");
  expect(client.auth.admin.deleteUser).toHaveBeenCalledWith("new-auth");
});
it("falha de sincronização das permissões do login não é reportada como sucesso", async () => {
  const client = admin(); client.auth.admin.updateUserById.mockResolvedValueOnce({ error: new Error("Auth indisponível") } as never);
  vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValueOnce({ auth_user_id: "existing-auth" } as never);
  await expect(syncAppMetadataWithClient(client as unknown as Parameters<typeof syncAppMetadataWithClient>[0], "existing-user")).rejects.toThrow("Auth indisponível");
  expect(client.auth.admin.deleteUser).not.toHaveBeenCalled();
});
