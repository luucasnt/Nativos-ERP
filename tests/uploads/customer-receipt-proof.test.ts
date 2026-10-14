import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: { directCollection: { findUnique: vi.fn() } } }));
vi.mock("@/lib/auth/get-current-user", async original => ({ ...await original<object>(), assertActiveUser: vi.fn() }));
const { download } = vi.hoisted(() => ({ download: vi.fn(async () => ({ data: new Blob(["%PDF-proof"], { type: "application/pdf" }), error: null })) }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: () => ({ storage: { from: () => ({ download }) } }) }));
import { prisma } from "@/lib/prisma";
import { assertActiveUser } from "@/lib/auth/get-current-user";
import { GET } from "@/app/api/portal/recebimentos/[id]/comprovante/route";
const id = "11111111-1111-4111-8111-111111111111";
const path = "44444444-4444-4444-4444-444444444444/55555555-5555-5555-5555-555555555555.pdf";
const receipt = { id, reversed_at: null, customer_amount: 380, receiver_type: "fornecedor", financial_responsible_id: "company", receipt_url: `storage://payment-receipts/${path}`, service: { supplier_id: "company", reservation: { code: "RES-2026-000002" } } };
beforeEach(() => { vi.clearAllMocks(); vi.mocked(prisma.directCollection.findUnique).mockResolvedValue(receipt as never); vi.mocked(assertActiveUser).mockResolvedValue({ account_type: "portal", linked_company_id: "company", linked_company: { roles: ["fornecedor"] } } as never); });
const get = () => GET(new Request("https://nativos.test/proof"), { params: Promise.resolve({ id }) });
it("empresa dona acessa comprovante privado com código da reserva", async () => {
  const response = await get(); expect(response.status).toBe(200); expect(response.headers.get("Cache-Control")).toBe("private, no-store"); expect(response.headers.get("Content-Disposition")).toContain("RES-2026-000002.pdf"); expect(download).toHaveBeenCalledWith(path);
});
it("outro fornecedor não acessa nem baixa o arquivo", async () => {
  vi.mocked(assertActiveUser).mockResolvedValue({ account_type: "portal", linked_company_id: "other", linked_company: { roles: ["fornecedor"] } } as never);
  expect((await get()).status).toBe(404); expect(download).not.toHaveBeenCalled();
});
it("registro revertido ou sem valor confirmado não libera comprovante", async () => {
  vi.mocked(prisma.directCollection.findUnique).mockResolvedValue({ ...receipt, customer_amount: null } as never);
  expect((await get()).status).toBe(404);
  vi.mocked(prisma.directCollection.findUnique).mockResolvedValue({ ...receipt, reversed_at: new Date() } as never);
  expect((await get()).status).toBe(404); expect(download).not.toHaveBeenCalled();
});
