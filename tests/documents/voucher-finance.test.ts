import { describe, expect, it } from "vitest";
import { voucherFinancialSummary } from "@/lib/documents/voucher-finance";
const service = { id: "one", price: "380.10", execution_status: "agendado", acceptance_status: "aceito", direct_collections: [] as Array<{ amount: string }> };
const entry = { party_id: "client", service_id: "one", payments: [{ amount: "100.05", type: "recebimento" }] };
const base = { client_id: "client", is_cortesia: false, collection_mode: "nativos", services: [service], finance_entries: [entry] };
describe("resumo financeiro do voucher", () => {
  it("calcula saldo em centavos e exclui pagamentos de outra parte", () => {
    const result = voucherFinancialSummary({ ...base, finance_entries: [entry, { ...entry, party_id: "other" }, { ...entry, payments: [{ amount: "200", type: "pagamento" }] }] });
    expect(result.total.toFixed(2)).toBe("380.10"); expect(result.paid.toFixed(2)).toBe("100.05"); expect(result.remaining.toFixed(2)).toBe("280.05");
  });
  it("conta cobrança direta ao passageiro e não depende de repasses à Nativos", () => {
    const result = voucherFinancialSummary({ ...base, collection_mode: "direto", finance_entries: [], services: [{ ...service, direct_collections: [{ amount: "80.10" }] }] });
    expect(result.remaining.toFixed(2)).toBe("0.00");
  });
  it("exclui serviços cancelados/recusados e pagamentos associados", () => {
    const result = voucherFinancialSummary({ ...base, services: [{ ...service, execution_status: "cancelado" }, { ...service, id: "refused", acceptance_status: "recusado" }] });
    expect(result.total.toFixed(2)).toBe("0.00"); expect(result.paid.toFixed(2)).toBe("0.00");
  });
  it("cortesia zera cobrança e pagamento a maior gera crédito, não saldo negativo", () => {
    expect(voucherFinancialSummary({ ...base, is_cortesia: true }).total.toFixed(2)).toBe("0.00");
    const result = voucherFinancialSummary({ ...base, finance_entries: [{ ...entry, payments: [{ amount: "400", type: "recebimento" }] }] });
    expect(result.remaining.toFixed(2)).toBe("0.00"); expect(result.credit.toFixed(2)).toBe("19.90");
  });
});
