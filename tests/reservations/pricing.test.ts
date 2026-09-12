import { describe, expect, it } from "vitest";
import {
  computeCollectionActor,
  computeServicePrice,
} from "@/lib/reservations/pricing";

describe("computeServicePrice", () => {
  it("sem desconto: price = original_price", () => {
    expect(computeServicePrice(500, "nenhum", null).toString()).toBe("500");
  });

  it("desconto percentual", () => {
    expect(computeServicePrice(1000, "percentual", 10).toString()).toBe("900");
  });

  it("desconto fixo", () => {
    expect(computeServicePrice(1000, "fixo", 150).toString()).toBe("850");
  });

  it("desconto fixo maior que o valor original trava em zero, nunca negativo", () => {
    expect(computeServicePrice(100, "fixo", 500).toString()).toBe("0");
  });

  it("desconto percentual de 100% zera o preço", () => {
    expect(computeServicePrice(400, "percentual", 100).toString()).toBe("0");
  });

  it("mantém precisão decimal exata (sem erro de ponto flutuante)", () => {
    // 0.1 + 0.2 !== 0.3 em ponto flutuante binário — Decimal deve acertar.
    expect(computeServicePrice("10.10", "percentual", 10).toString()).toBe("9.09");
  });
});

describe("computeCollectionActor — regra não-negociável (spec seção 5)", () => {
  it("collection_mode nativos => sempre nativos, qualquer execução", () => {
    expect(computeCollectionActor("nativos", "propria")).toBe("nativos");
    expect(computeCollectionActor("nativos", "fornecedor")).toBe("nativos");
  });

  it("collection_mode faturado => sempre nativos, qualquer execução", () => {
    expect(computeCollectionActor("faturado", "propria")).toBe("nativos");
    expect(computeCollectionActor("faturado", "fornecedor")).toBe("nativos");
  });

  it("collection_mode direto + execução própria => motorista_proprio", () => {
    expect(computeCollectionActor("direto", "propria")).toBe("motorista_proprio");
  });

  it("collection_mode direto + execução fornecedor => fornecedor", () => {
    expect(computeCollectionActor("direto", "fornecedor")).toBe("fornecedor");
  });
});
