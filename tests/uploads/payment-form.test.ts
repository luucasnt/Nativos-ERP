// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { RegisterPaymentForm } from "@/components/admin/register-payment-form";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it("pede data, envia imagem/PDF como arquivo e registra referência privada sem campo de link", async () => {
  const proof = "storage://payment-receipts/11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222.pdf";
  const fetcher = vi.fn(async () => ({ ok: true, json: async () => ({ receiptUrl: proof }) }));
  vi.stubGlobal("fetch", fetcher);
  const register = vi.fn(async () => {});
  render(React.createElement(RegisterPaymentForm, { entryId: crypto.randomUUID(), remainingAmount: "480.00", bankAccounts: [], onRegister: register }));
  fireEvent.click(screen.getByRole("button", { name: "Registrar pagamento" }));
  expect(screen.queryByText(/Link do comprovante/)).toBeNull();
  const input = screen.getByLabelText(/Data do recebimento/);
  fireEvent.change(input, { target: { value: "2020-01-01" } });
  const file = new File(["%PDF-1.7 test"], "comprovante.pdf", { type: "application/pdf" });
  fireEvent.change(screen.getByLabelText(/Anexar comprovante/), { target: { files: [file] } });
  fireEvent.click(screen.getByRole("button", { name: "Confirmar pagamento" }));
  await waitFor(() => expect(register).toHaveBeenCalled());
  expect(fetcher).toHaveBeenCalledWith("/api/admin/comprovantes", expect.objectContaining({ method: "POST", body: expect.any(FormData) }));
  expect(register).toHaveBeenCalledWith(expect.objectContaining({ paymentDate: "2020-01-01", receiptUrl: proof, amount: "480.00" }));
});
it("sem anexo explica o que falta e não envia pagamento ao servidor", async () => {
  const register = vi.fn(async () => {});
  render(React.createElement(RegisterPaymentForm, { entryId: crypto.randomUUID(), remainingAmount: "480.00", bankAccounts: [], onRegister: register }));
  fireEvent.click(screen.getByRole("button", { name: "Registrar pagamento" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirmar pagamento" }));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Selecione uma imagem ou PDF"));
  expect(register).not.toHaveBeenCalled();
  expect(screen.queryByRole("status")).toBeNull();
});
it("apresenta validação retornada pelo servidor sem confirmar sucesso", async () => {
  const register = vi.fn(async () => ({ error: "Existe um caixa fechado nessa data." }));
  render(React.createElement(RegisterPaymentForm, { entryId: crypto.randomUUID(), remainingAmount: "480.00", bankAccounts: [], proofRequired: false, onRegister: register }));
  fireEvent.click(screen.getByRole("button", { name: "Registrar pagamento" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirmar pagamento" }));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("caixa fechado"));
  expect(screen.queryByRole("status")).toBeNull();
});
