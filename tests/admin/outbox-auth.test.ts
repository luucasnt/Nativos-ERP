import { describe, expect, it, vi } from "vitest";
vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn(() => { throw new Error("Cron must not require a Supabase browser session"); }) }));
vi.mock("@/lib/communication/outbox", () => ({ processOutboxOnce: vi.fn(async () => ({ processed: 0 })) }));
import { NextRequest } from "next/server";
import { updateSession, AUTH_USER_ID_HEADER } from "@/lib/supabase/middleware";
import { GET } from "@/app/api/outbox/process/route";

describe("cron protegido por segredo", () => {
  it("passa pelo middleware sem sessão e descarta header falsificado", async () => {
    const request = new NextRequest("https://erp.test/api/outbox/process", { headers: { [AUTH_USER_ID_HEADER]: crypto.randomUUID() } });
    const response = await updateSession(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(request.headers.has(AUTH_USER_ID_HEADER)).toBe(false);
  });
  it("rejeita cron sem segredo", async () => {
    vi.stubEnv("CRON_SECRET", "test-secret");
    const response = await GET(new Request("https://erp.test/api/outbox/process"));
    expect(response.status).toBe(401);
    vi.unstubAllEnvs();
  });
  it("aceita cron com segredo correto", async () => {
    vi.stubEnv("CRON_SECRET", "test-secret");
    const response = await GET(new Request("https://erp.test/api/outbox/process", { headers: { authorization: "Bearer test-secret" } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ processed: 0 });
    vi.unstubAllEnvs();
  });
});
