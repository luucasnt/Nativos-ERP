import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: { changeRequest: { findUnique: vi.fn() }, payment: { findFirst: vi.fn() } } }));
vi.mock("@/lib/auth/get-current-user", async importOriginal => ({ ...await importOriginal<object>(), assertActiveUser: vi.fn() }));
const { download } = vi.hoisted(() => ({ download: vi.fn(async () => ({ data: new Blob(["%PDF-test"], { type: "application/pdf" }), error: null })) }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: () => ({ storage: { from: () => ({ download }) } }) }));
import { prisma } from "@/lib/prisma";
import { assertActiveUser } from "@/lib/auth/get-current-user";
import { GET } from "@/app/api/portal/comprovantes/[requestId]/route";
const requestId = "11111111-1111-4111-8111-111111111111"; const entryId = "22222222-2222-4222-8222-222222222222"; const paymentId = "33333333-3333-4333-8333-333333333333";
const proofPath = "44444444-4444-4444-4444-444444444444/55555555-5555-5555-5555-555555555555.pdf";
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.changeRequest.findUnique).mockResolvedValue({ id: requestId, protocol: "SOL-2026-000001", type: "pagamento_fornecedor", company_id: "company", allocation_details: { entry_ids: [entryId], payment_ids: [paymentId] } } as never);
  vi.mocked(prisma.payment.findFirst).mockResolvedValue({ receipt_url: `storage://payment-receipts/${proofPath}` } as never);
  vi.mocked(assertActiveUser).mockResolvedValue({ account_type: "portal", role: "user", internal_role: null, is_owner: false, linked_company_id: "company", linked_company: { roles: ["fornecedor"] } } as never);
});
function get() { return GET(new Request(`https://nativos.test/api/portal/comprovantes/${requestId}`), { params: Promise.resolve({ requestId }) }); }
it("fornecedor vê comprovante do pagamento feito pela Nativos ao seu pedido", async () => {
  const response = await get(); expect(response.status).toBe(200); expect(response.headers.get("Cache-Control")).toBe("private, no-store"); expect(download).toHaveBeenCalledWith(proofPath);
  expect(prisma.payment.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ finance_entry_id: { in: [entryId] }, finance_entry: { party_type: "fornecedor", party_id: "company" } }) }));
});
it("outro fornecedor não acessa o comprovante nem consulta o pagamento", async () => {
  vi.mocked(assertActiveUser).mockResolvedValue({ account_type: "portal", role: "user", linked_company_id: "other-company", linked_company: { roles: ["fornecedor"] } } as never);
  expect((await get()).status).toBe(404); expect(prisma.payment.findFirst).not.toHaveBeenCalled(); expect(download).not.toHaveBeenCalled();
});
it("pagamento desvinculado do pedido ou estornado não libera o arquivo privado", async () => {
  vi.mocked(prisma.payment.findFirst).mockResolvedValue(null);
  expect((await get()).status).toBe(404); expect(download).not.toHaveBeenCalled();
});
