// Suite de integridade obrigatória (spec seção 10, Fase 4): simula as 3
// variáveis comerciais independentes em combinação — execução (própria/
// fornecedor), quem cobra o passageiro (nativos/motorista próprio/
// fornecedor) e indicação/comissão — e prova que o razão sempre bate.
import { describe, expect, it } from "vitest";
import type { ServiceSettlementInput } from "@/lib/finance/settlement";
import { computeServiceSettlementEntries } from "@/lib/finance/settlement";

const CLIENT_ID = "client-1";
const PARTNER_ID = "partner-1";
const SUPPLIER_ID = "supplier-1";
const DRIVER_ID = "driver-1";

function baseInput(overrides: Partial<ServiceSettlementInput> = {}): ServiceSettlementInput {
  return {
    price: 1000,
    supplier_cost: null,
    execution_type: "propria",
    collection_mode: "nativos",
    is_cortesia: false,
    origin_partner_id: null,
    client_id: CLIENT_ID,
    supplier_id: null,
    supplier_settlement_mode: null,
    driver_id: null,
    driver_owner_type: null,
    driver_payment_type: null,
    driver_commission_percent: null,
    ...overrides,
  };
}

function amountsByCategory(entries: ReturnType<typeof computeServiceSettlementEntries>) {
  return Object.fromEntries(entries.map((e) => [`${e.type}:${e.category}`, e.amount.toString()]));
}

describe("execução própria", () => {
  it("cobrança Nativos, sem motorista com comissão => só venda_servico", () => {
    const entries = computeServiceSettlementEntries(baseInput());
    expect(amountsByCategory(entries)).toEqual({ "receita:venda_servico": "1000" });
    expect(entries[0].party_type).toBe("cliente");
    expect(entries[0].party_id).toBe(CLIENT_ID);
  });

  it("cobrança Nativos + motorista próprio comissionado => venda_servico + repasse_motorista (despesa)", () => {
    const entries = computeServiceSettlementEntries(
      baseInput({
        driver_id: DRIVER_ID,
        driver_owner_type: "proprio",
        driver_payment_type: "comissao",
        driver_commission_percent: 20,
      }),
    );
    expect(amountsByCategory(entries)).toEqual({
      "receita:venda_servico": "1000",
      "despesa:repasse_motorista": "200",
    });
  });

  it("comissão do motorista incide sobre o líquido após despesas da reserva", () => {
    const entries = computeServiceSettlementEntries(
      baseInput({
        price: 380,
        service_expense_total: 120,
        driver_id: DRIVER_ID,
        driver_owner_type: "proprio",
        driver_payment_type: "comissao",
        driver_commission_percent: 30,
      }),
    );
    expect(amountsByCategory(entries)).toEqual({
      "receita:venda_servico": "380",
      "despesa:repasse_motorista": "78",
    });
  });

  it("motorista com payment_type diaria => nenhum repasse POR SERVIÇO (o repasse por dia é gerado à parte, ver tests/finance/lifecycle.test.ts)", () => {
    const entries = computeServiceSettlementEntries(
      baseInput({
        driver_id: DRIVER_ID,
        driver_owner_type: "proprio",
        driver_payment_type: "diaria",
      }),
    );
    expect(amountsByCategory(entries)).toEqual({ "receita:venda_servico": "1000" });
  });

  it("cobrança direta pelo motorista próprio, sem comissão configurada => repasse_motorista (receita) = price cheio", () => {
    const entries = computeServiceSettlementEntries(
      baseInput({ collection_mode: "direto", driver_id: DRIVER_ID, driver_owner_type: "proprio" }),
    );
    expect(amountsByCategory(entries)).toEqual({ "receita:repasse_motorista": "1000" });
  });

  it("cobrança direta pelo motorista próprio comissionado => repasse_motorista (receita) = price - comissão", () => {
    const entries = computeServiceSettlementEntries(
      baseInput({
        collection_mode: "direto",
        driver_id: DRIVER_ID,
        driver_owner_type: "proprio",
        driver_payment_type: "comissao",
        driver_commission_percent: 30,
      }),
    );
    expect(amountsByCategory(entries)).toEqual({ "receita:repasse_motorista": "700" });
  });

  it("faturado ao parceiro => venda_servico com party=parceiro", () => {
    const entries = computeServiceSettlementEntries(
      baseInput({ collection_mode: "faturado", origin_partner_id: PARTNER_ID }),
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].party_type).toBe("parceiro");
    expect(entries[0].party_id).toBe(PARTNER_ID);
  });

  it("cortesia => nenhum lançamento de receita, mesmo com motorista comissionado (Nativos absorve o custo)", () => {
    const entries = computeServiceSettlementEntries(
      baseInput({
        is_cortesia: true,
        driver_id: DRIVER_ID,
        driver_owner_type: "proprio",
        driver_payment_type: "comissao",
        driver_commission_percent: 20,
      }),
    );
    expect(amountsByCategory(entries)).toEqual({ "despesa:repasse_motorista": "200" });
  });

  it("cortesia + cobrança direta => nenhum lançamento (nada foi cobrado do passageiro)", () => {
    const entries = computeServiceSettlementEntries(
      baseInput({ is_cortesia: true, collection_mode: "direto", driver_id: DRIVER_ID, driver_owner_type: "proprio" }),
    );
    expect(entries).toEqual([]);
  });
});

describe("execução por fornecedor", () => {
  it("cobrança Nativos => venda_servico + pagamento_fornecedor pelo custo", () => {
    const entries = computeServiceSettlementEntries(
      baseInput({ execution_type: "fornecedor", supplier_id: SUPPLIER_ID, supplier_cost: 700 }),
    );
    expect(amountsByCategory(entries)).toEqual({
      "receita:venda_servico": "1000",
      "despesa:pagamento_fornecedor": "700",
    });
  });

  it("cobrança direta, retém custo => só repasse_fornecedor pela margem (nunca venda bruta + pagamento separados)", () => {
    const entries = computeServiceSettlementEntries(
      baseInput({
        execution_type: "fornecedor",
        collection_mode: "direto",
        supplier_id: SUPPLIER_ID,
        supplier_cost: 700,
        supplier_settlement_mode: "retain_supplier_cost",
      }),
    );
    expect(amountsByCategory(entries)).toEqual({ "receita:repasse_fornecedor": "300" });
  });

  it("cobrança direta, repassa bruto => repasse_fornecedor (bruto) + pagamento_fornecedor (custo) simultâneos", () => {
    const entries = computeServiceSettlementEntries(
      baseInput({
        execution_type: "fornecedor",
        collection_mode: "direto",
        supplier_id: SUPPLIER_ID,
        supplier_cost: 700,
        supplier_settlement_mode: "gross_repass",
      }),
    );
    expect(amountsByCategory(entries)).toEqual({
      "receita:repasse_fornecedor": "1000",
      "despesa:pagamento_fornecedor": "700",
    });
  });

  it("faturado ao parceiro => venda_servico(parceiro) + pagamento_fornecedor", () => {
    const entries = computeServiceSettlementEntries(
      baseInput({
        execution_type: "fornecedor",
        collection_mode: "faturado",
        origin_partner_id: PARTNER_ID,
        supplier_id: SUPPLIER_ID,
        supplier_cost: 700,
      }),
    );
    expect(amountsByCategory(entries)).toEqual({
      "receita:venda_servico": "1000",
      "despesa:pagamento_fornecedor": "700",
    });
  });

  it("cortesia + cobrança Nativos => sem venda_servico, mas paga o fornecedor normalmente", () => {
    const entries = computeServiceSettlementEntries(
      baseInput({ execution_type: "fornecedor", is_cortesia: true, supplier_id: SUPPLIER_ID, supplier_cost: 700 }),
    );
    expect(amountsByCategory(entries)).toEqual({ "despesa:pagamento_fornecedor": "700" });
  });

  it("cortesia + cobrança direta + retém custo => registro de rastreio amount=0, category=cortesia, já fechado (nunca gera Payment)", () => {
    const entries = computeServiceSettlementEntries(
      baseInput({
        execution_type: "fornecedor",
        collection_mode: "direto",
        is_cortesia: true,
        supplier_id: SUPPLIER_ID,
        supplier_cost: 700,
        supplier_settlement_mode: "retain_supplier_cost",
      }),
    );
    expect(amountsByCategory(entries)).toEqual({ "receita:cortesia": "0" });
    expect(entries[0].finalized).toBe(true);
    expect(entries[0].party_type).toBe("fornecedor");
    expect(entries[0].party_id).toBe(SUPPLIER_ID);
  });

  it("cortesia + cobrança direta + repassa bruto => Nativos ainda paga o custo ao fornecedor", () => {
    const entries = computeServiceSettlementEntries(
      baseInput({
        execution_type: "fornecedor",
        collection_mode: "direto",
        is_cortesia: true,
        supplier_id: SUPPLIER_ID,
        supplier_cost: 700,
        supplier_settlement_mode: "gross_repass",
      }),
    );
    expect(amountsByCategory(entries)).toEqual({ "despesa:pagamento_fornecedor": "700" });
  });

  it("supplier_cost zero ou não informado não gera pagamento_fornecedor de R$0", () => {
    const entries = computeServiceSettlementEntries(
      baseInput({ execution_type: "fornecedor", supplier_id: SUPPLIER_ID, supplier_cost: 0 }),
    );
    expect(amountsByCategory(entries)).toEqual({ "receita:venda_servico": "1000" });
  });
});

describe("precisão decimal", () => {
  it("nunca usa ponto flutuante binário para dividir comissão", () => {
    const entries = computeServiceSettlementEntries(
      baseInput({
        execution_type: "fornecedor",
        supplier_id: SUPPLIER_ID,
        supplier_cost: "333.33",
        price: "1000.00",
      }),
    );
    expect(amountsByCategory(entries)["despesa:pagamento_fornecedor"]).toBe("333.33");
  });
});
