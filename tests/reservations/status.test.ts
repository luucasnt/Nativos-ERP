import { describe, expect, it } from "vitest";
import { computeReservationStatus } from "@/lib/reservations/status-pure";

type Slice = Parameters<typeof computeReservationStatus>[0][number];

function service(
  acceptance: Slice["acceptance_status"],
  execution: Slice["execution_status"],
): Slice {
  return { acceptance_status: acceptance, execution_status: execution };
}

describe("computeReservationStatus (enum confirmado pelo cliente na revisão da Fase 3)", () => {
  it("sem serviços => rascunho", () => {
    expect(computeReservationStatus([])).toEqual({
      status: "rascunho",
      has_partial_cancellation: false,
    });
  });

  it("todos cancelados => cancelado (cancelamento total não conta como parcial)", () => {
    expect(
      computeReservationStatus([
        service("aceito", "cancelado"),
        service("recusado", "cancelado"),
      ]),
    ).toEqual({ status: "cancelado", has_partial_cancellation: false });
  });

  it("todos concluídos (sem cancelamento) => concluido", () => {
    expect(
      computeReservationStatus([service("aceito", "concluido"), service("aceito", "concluido")]),
    ).toEqual({ status: "concluido", has_partial_cancellation: false });
  });

  it("alguns concluídos, um cancelado no meio => concluido + has_partial_cancellation", () => {
    expect(
      computeReservationStatus([
        service("aceito", "concluido"),
        service("aceito", "cancelado"),
      ]),
    ).toEqual({ status: "concluido", has_partial_cancellation: true });
  });

  it("algum em andamento => em_andamento", () => {
    expect(
      computeReservationStatus([service("aceito", "em_andamento"), service("aceito", "agendado")]),
    ).toEqual({ status: "em_andamento", has_partial_cancellation: false });
  });

  it("um concluído e outro ainda agendado => em_andamento (execução já começou)", () => {
    expect(
      computeReservationStatus([service("aceito", "concluido"), service("aceito", "agendado")]),
    ).toEqual({ status: "em_andamento", has_partial_cancellation: false });
  });

  it("em andamento com um serviço cancelado no meio => em_andamento + has_partial_cancellation", () => {
    expect(
      computeReservationStatus([
        service("aceito", "em_andamento"),
        service("aceito", "cancelado"),
      ]),
    ).toEqual({ status: "em_andamento", has_partial_cancellation: true });
  });

  it("algum aguardando aceite do fornecedor => pendente", () => {
    expect(
      computeReservationStatus([
        service("aceito", "agendado"),
        service("aguardando_aceite", "agendado"),
      ]),
    ).toEqual({ status: "pendente", has_partial_cancellation: false });
  });

  it("algum recusado pelo fornecedor => pendente (mesma ação de reatribuir e seguir)", () => {
    expect(
      computeReservationStatus([service("aceito", "agendado"), service("recusado", "agendado")]),
    ).toEqual({ status: "pendente", has_partial_cancellation: false });
  });

  it("tudo agendado e aceito => confirmado", () => {
    expect(
      computeReservationStatus([service("aceito", "agendado"), service("aceito", "agendado")]),
    ).toEqual({ status: "confirmado", has_partial_cancellation: false });
  });
});
