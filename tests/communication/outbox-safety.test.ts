import { afterEach, describe, expect, it, vi } from "vitest";
const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("resend", () => ({ Resend: class { emails = { send }; } }));
import { prisma } from "@/lib/prisma";
import { enqueueCommunication, processCommunicationNow } from "@/lib/communication/outbox";
afterEach(() => { vi.unstubAllEnvs(); send.mockReset(); });
async function message() {
  const key = `outbox-safe-${crypto.randomUUID()}`;
  await prisma.emailTemplate.create({ data: { key, name: "Teste", category: "teste", subject: "Teste", body: "Teste", active: true } });
  return enqueueCommunication({ templateKey: key, recipientType: "cliente", recipientEmail: "teste@example.test", idempotencyKey: crypto.randomUUID() });
}
describe("outbox com lease e deduplicação", () => {
  it("dois processadores não enviam o mesmo e-mail simultaneamente", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key"); const m = await message();
    let release!: () => void; let started!: () => void;
    const sending = new Promise<void>((resolve) => { started = resolve; });
    send.mockImplementation(async () => { started(); await new Promise<void>((resolve) => { release = resolve; }); return { data: { id: "test" }, error: null }; });
    const first = processCommunicationNow(m.id); await sending;
    const second = await processCommunicationNow(m.id); expect(second?.status).toBe("enviando"); expect(send).toHaveBeenCalledTimes(1);
    release(); expect((await first)?.status).toBe("enviado");
    await processCommunicationNow(m.id); expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][1]).toEqual({ idempotencyKey: `nativos-communication:${m.id}` });
  });
  it("recupera envio interrompido dentro da janela de deduplicação", async () => { vi.stubEnv("RESEND_API_KEY", "test-key"); send.mockResolvedValue({ data: { id: "test" }, error: null }); const m = await message(); await prisma.communication.update({ where: { id: m.id }, data: { status: "enviando", attempts: 1, updated_at: new Date(Date.now() - 20 * 60 * 1000) } }); const result = await processCommunicationNow(m.id); expect(result?.status).toBe("enviado"); expect(result?.attempts).toBe(2); });
  it("não reenvia envio incerto depois de expirar a proteção do provedor", async () => { vi.stubEnv("RESEND_API_KEY", "test-key"); const m = await message(); await prisma.communication.update({ where: { id: m.id }, data: { status: "enviando", attempts: 1, updated_at: new Date(Date.now() - 25 * 60 * 60 * 1000) } }); const result = await processCommunicationNow(m.id); expect(result?.status).toBe("falhou"); expect(result?.attempts).toBe(5); expect(send).not.toHaveBeenCalled(); });
  it("não envia template desativado", async () => { vi.stubEnv("RESEND_API_KEY", "test-key"); const m = await message(); await prisma.emailTemplate.update({ where: { key: m.template_key }, data: { active: false } }); expect((await processCommunicationNow(m.id))?.status).toBe("cancelado"); expect(send).not.toHaveBeenCalled(); });
});
