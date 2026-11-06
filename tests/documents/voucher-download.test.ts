import { beforeEach, expect, it, vi } from "vitest";
const { authorize, load, renderVoucher } = vi.hoisted(() => ({
  authorize: vi.fn(),
  load: vi.fn(),
  renderVoucher: vi.fn(),
}));
vi.mock("@/lib/documents/auth", () => ({ assertCanAccessReservationDocument: authorize }));
vi.mock("@/lib/documents/voucher", () => ({ loadVoucherData: load, VoucherDocument: renderVoucher }));
vi.mock("@react-pdf/renderer", () => ({ renderToBuffer: async () => Buffer.from("%PDF-test") }));
import { GET } from "@/app/api/documentos/voucher/[reservationId]/route";
import { GET as download } from "@/app/api/documentos/voucher/[reservationId]/[filename]/route";

const url = "https://erp.test/api/documentos/voucher/id";
const params = Promise.resolve({ reservationId: "id" });
beforeEach(() => {
  vi.clearAllMocks();
  authorize.mockResolvedValue({ account_type: "internal" });
});
function savedPreference(showPrice: boolean) {
  load.mockImplementation(async () => ({
    showPrice,
    reservation: { code: "RES-001", client: { name: "Cliente" } },
  }));
}

it.each([["sim", true], ["nao", false]] as const)("mantém financeiro=%s até o PDF, acima da preferência salva", async (option, expected) => {
  savedPreference(!expected);
  const first = await GET(new Request(`${url}?financeiro=${option}&ignorar=1`), { params });
  expect(first.status).toBe(307);
  const location = new URL(first.headers.get("Location")!);
  expect(location.search).toBe(`?financeiro=${option}`);
  const pdf = await download(new Request(location), { params });
  expect(pdf.status).toBe(200);
  expect(pdf.headers.get("Content-Disposition")).toContain(expected ? "Com-Resumo-Financeiro.pdf" : "Sem-Resumo-Financeiro.pdf");
  expect(renderVoucher).toHaveBeenCalledWith({ data: expect.objectContaining({ showPrice: expected }) });
});

it("mantém a preferência salva no portal e impede que um parceiro a sobreponha", async () => {
  savedPreference(false);
  authorize.mockResolvedValue({ account_type: "portal" });
  const blocked = await GET(new Request(`${url}?financeiro=sim`), { params });
  expect(blocked.status).toBe(403);
  expect(load).not.toHaveBeenCalled();
  const first = await GET(new Request(url), { params });
  const pdf = await download(new Request(first.headers.get("Location")!), { params });
  expect(pdf.status).toBe(200);
  expect(renderVoucher).toHaveBeenCalledWith({ data: expect.objectContaining({ showPrice: false }) });
});
