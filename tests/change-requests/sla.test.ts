import { describe, expect, it } from "vitest";
import {
  changeRequestCategoryForType,
  computeChangeRequestDeadline,
  isChangeRequestOverdue,
} from "@/lib/change-requests/sla";

describe("changeRequestCategoryForType", () => {
  it("classifica tipos com dinheiro envolvido como financeiro", () => {
    expect(changeRequestCategoryForType("repasse_nativos")).toBe("financeiro");
    expect(changeRequestCategoryForType("pagamento_fatura")).toBe("financeiro");
    expect(changeRequestCategoryForType("contestacao_valor")).toBe("financeiro");
    expect(changeRequestCategoryForType("antecipacao_fatura")).toBe("financeiro");
  });

  it("classifica o resto como operacional", () => {
    expect(changeRequestCategoryForType("nova_reserva")).toBe("operacional");
    expect(changeRequestCategoryForType("alteracao")).toBe("operacional");
    expect(changeRequestCategoryForType("cancelamento")).toBe("operacional");
    expect(changeRequestCategoryForType("cadastro_motorista")).toBe("operacional");
    expect(changeRequestCategoryForType("outro")).toBe("operacional");
  });
});

describe("computeChangeRequestDeadline", () => {
  it("operacional: 30 minutos", () => {
    const createdAt = new Date("2026-01-01T10:00:00Z");
    expect(computeChangeRequestDeadline(createdAt, "operacional").toISOString()).toBe(
      "2026-01-01T10:30:00.000Z",
    );
  });

  it("financeiro: 2 horas", () => {
    const createdAt = new Date("2026-01-01T10:00:00Z");
    expect(computeChangeRequestDeadline(createdAt, "financeiro").toISOString()).toBe(
      "2026-01-01T12:00:00.000Z",
    );
  });
});

describe("isChangeRequestOverdue", () => {
  const createdAt = new Date("2026-01-01T10:00:00Z");

  it("operacional: atrasada depois de 30min ainda aberta", () => {
    const now = new Date("2026-01-01T10:31:00Z");
    expect(isChangeRequestOverdue({ createdAt, category: "operacional", status: "solicitada", now })).toBe(true);
  });

  it("operacional: não atrasada antes de 30min", () => {
    const now = new Date("2026-01-01T10:29:00Z");
    expect(isChangeRequestOverdue({ createdAt, category: "operacional", status: "solicitada", now })).toBe(false);
  });

  it("nunca atrasada depois de decidida, mesmo com o prazo estourado", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    expect(isChangeRequestOverdue({ createdAt, category: "operacional", status: "aprovada", now })).toBe(false);
    expect(isChangeRequestOverdue({ createdAt, category: "operacional", status: "rejeitada", now })).toBe(false);
    expect(isChangeRequestOverdue({ createdAt, category: "operacional", status: "concluida", now })).toBe(false);
  });

  it("em_analise ainda conta como aberta para fins de SLA", () => {
    const now = new Date("2026-01-01T13:00:00Z");
    expect(isChangeRequestOverdue({ createdAt, category: "financeiro", status: "em_analise", now })).toBe(true);
  });
});
