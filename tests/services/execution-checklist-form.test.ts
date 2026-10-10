// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
vi.mock("@/lib/services/service-execution", () => ({ saveServiceChecklist: vi.fn(async () => ({ error: null })), startService: vi.fn(async () => ({ error: null })), completeService: vi.fn(async () => ({ error: null })) }));
import { saveServiceChecklist, startService, completeService } from "@/lib/services/service-execution";
import { ServiceExecutionActions } from "@/components/portal/service-execution-actions";
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); }; HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); }; });
it("Iniciar serviço apresenta checklist no mesmo fluxo e salva antes de iniciar", async () => {
  render(React.createElement(ServiceExecutionActions, { serviceId: "service", executionStatus: "agendado" }));
  fireEvent.click(screen.getByRole("button", { name: "Iniciar serviço" }));
  const button = screen.getByRole("button", { name: "Salvar e iniciar serviço" });
  expect((button as HTMLButtonElement).disabled).toBe(true);
  for (const box of screen.getAllByRole("checkbox")) fireEvent.click(box);
  fireEvent.click(button);
  await waitFor(() => expect(startService).toHaveBeenCalledWith("service"));
  expect(saveServiceChecklist).toHaveBeenCalledWith("service", "preflight", expect.objectContaining({ vehicle_clean: true, documents_ready: true }));
  expect(vi.mocked(saveServiceChecklist).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(startService).mock.invocationCallOrder[0]);
});
it("Finalizar serviço usa os itens de encerramento e mantém erro visível sem encerrar", async () => {
  vi.mocked(saveServiceChecklist).mockResolvedValueOnce({ error: "Serviço indisponível" });
  render(React.createElement(ServiceExecutionActions, { serviceId: "service", executionStatus: "em_andamento" }));
  fireEvent.click(screen.getByRole("button", { name: "Finalizar serviço" }));
  expect(screen.getAllByRole("checkbox")).toHaveLength(3);
  for (const box of screen.getAllByRole("checkbox")) fireEvent.click(box);
  fireEvent.click(screen.getByRole("button", { name: "Salvar e finalizar serviço" }));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("indisponível"));
  expect(completeService).not.toHaveBeenCalled();
});
