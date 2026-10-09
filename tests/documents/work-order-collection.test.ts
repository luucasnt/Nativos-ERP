import { describe, expect, it } from "vitest";
import { workOrderCollection } from "@/lib/documents/work-order-collection";
const base = { price: "480", collection_actor: "motorista_proprio", driver_can_receive_payment: false, execution_status: "agendado", acceptance_status: "aceito", reservation: { status: "confirmado", is_cortesia: false, collection_mode: "direto" }, finance_entries: [], direct_collections: [] };
describe("cobrança operacional na OS", () => {
  it("cobrança direta prevalece sobre checkbox e sempre informa o valor integral do cliente", () => {
    expect(workOrderCollection(base).replace(/\s+/g, " ")).toContain("Motorista deve receber diretamente do cliente: R$ 480,00");
    expect(workOrderCollection({ ...base, collection_actor: "fornecedor" })).toContain("Motorista/fornecedor");
  });
  it("autorização de cobrança pela Nativos informa somente o saldo após sinal", () => {
    const service = { ...base, driver_can_receive_payment: true, reservation: { ...base.reservation, collection_mode: "nativos" }, finance_entries: [{ type: "receita", category: "venda_servico", party_type: "cliente", payments: [{ amount: "200", type: "recebimento" }] }] };
    expect(workOrderCollection(service).replace(/\s+/g, " ")).toContain("R$ 280,00");
    service.finance_entries[0].payments[0].amount = "480";
    expect(workOrderCollection(service)).toContain("Não cobrar novamente");
  });
  it("não cobra cortesia, parceiro faturado, pago ou serviço sem autorização", () => {
    expect(workOrderCollection({ ...base, reservation: { ...base.reservation, is_cortesia: true } })).toContain("Não cobrar");
    expect(workOrderCollection({ ...base, reservation: { ...base.reservation, collection_mode: "faturado" } })).toContain("Não cobrar");
    expect(workOrderCollection({ ...base, direct_collections: [{ status: "received" }] })).toContain("Não cobrar novamente");
    expect(workOrderCollection({ ...base, reservation: { ...base.reservation, collection_mode: "nativos" } })).toContain("Não realizar cobrança");
  });
});
