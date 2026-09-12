import { describe, expect, it } from "vitest";
import { computeReservationStatus } from "@/lib/reservations/status-pure";

type Slice = Parameters<typeof computeReservationStatus>[0][number];

function service(
  acceptance: Slice["acceptance_status"],
  execution: Slice["execution_status"],
): Slice {
  return { acceptance_status: acceptance, execution_status: execution };
}

describe("computeReservationStatus (INFERIDO — algoritmo definido na Fase 3)", () => {
  it("sem serviços => aguardando_confirmacao", () => {
    expect(computeReservationStatus([])).toBe("aguardando_confirmacao");
  });

  it("todos cancelados => cancelada", () => {
    expect(
      computeReservationStatus([
        service("aceito", "cancelado"),
        service("recusado", "cancelado"),
      ]),
    ).toBe("cancelada");
  });

  it("todos concluídos (sem cancelamento) => concluida", () => {
    expect(
      computeReservationStatus([service("aceito", "concluido"), service("aceito", "concluido")]),
    ).toBe("concluida");
  });

  it("alguns concluídos, um cancelado no meio => parcialmente_cancelada", () => {
    expect(
      computeReservationStatus([
        service("aceito", "concluido"),
        service("aceito", "cancelado"),
      ]),
    ).toBe("parcialmente_cancelada");
  });

  it("algum em andamento => em_andamento", () => {
    expect(
      computeReservationStatus([service("aceito", "em_andamento"), service("aceito", "agendado")]),
    ).toBe("em_andamento");
  });

  it("um concluído e outro ainda agendado => em_andamento (execução já começou)", () => {
    expect(
      computeReservationStatus([service("aceito", "concluido"), service("aceito", "agendado")]),
    ).toBe("em_andamento");
  });

  it("algum aguardando aceite do fornecedor => aguardando_confirmacao", () => {
    expect(
      computeReservationStatus([
        service("aceito", "agendado"),
        service("aguardando_aceite", "agendado"),
      ]),
    ).toBe("aguardando_confirmacao");
  });

  it("algum recusado pelo fornecedor => aguardando_confirmacao (precisa reatribuição)", () => {
    expect(
      computeReservationStatus([service("aceito", "agendado"), service("recusado", "agendado")]),
    ).toBe("aguardando_confirmacao");
  });

  it("tudo agendado e aceito => confirmada", () => {
    expect(
      computeReservationStatus([service("aceito", "agendado"), service("aceito", "agendado")]),
    ).toBe("confirmada");
  });
});
