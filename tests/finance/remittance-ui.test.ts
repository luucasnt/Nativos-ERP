// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("@/app/portal/empresa/actions", () => ({ confirmNotReceivedPortalEmpresa: vi.fn(async () => ({ error: null })), registerSupplierCustomerReceipt: vi.fn(async () => ({ error: null, success: "Recebimento registrado" })), confirmReceivedPortalEmpresa: vi.fn(async () => ({ error: null })), submitRepasseRequestEmpresa: vi.fn(async () => ({ error: null, success: "Pedido enviado" })), reportSupplierRemittance: vi.fn(async () => ({ error: null })), requestSupplierDriverAccess: vi.fn() }));
vi.mock("@/app/admin/solicitacoes/actions", () => ({ confirmSupplierRemittance: vi.fn(async () => ({ error: null })), paySupplierRequest: vi.fn(), rejectRemittanceRequest: vi.fn(), closeSettledRemittanceRequest: vi.fn() }));
import { SupplierFinanceCards, type SupplierFinanceCard } from "@/components/portal/supplier-finance-cards";
import { RemittanceReviewCard } from "@/components/admin/remittance-review-card";
import { submitRepasseRequestEmpresa } from "@/app/portal/empresa/actions";
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const entry: SupplierFinanceCard = { id: "11111111-1111-1111-1111-111111111111", dedupeKey: "22222222-2222-2222-2222-222222222222", reservation: "RES-2026-000001", passenger: "Passageiro de exemplo", service: "Transfer de saída", date: "12/10/2026 · 14:00", driver: "David", total: 700, balance: 500, paid: 200, servicePrice: 1000, supplierCost: 300, direction: "receber", eligible: true, collectionConfirmed: true, serviceId: "service", pendingProtocol: null };
it("fornecedor vê passageiro, serviço e saldo e solicita sem escolher lançamentos", async () => {
  render(React.createElement(SupplierFinanceCards, { entries: [entry] }));
  expect(screen.getByText("Passageiro de exemplo")).toBeTruthy(); expect(screen.getByText(/12\/10\/2026/)).toBeTruthy();
  expect(screen.getByText("Falta a Nativos pagar")).toBeTruthy(); expect(screen.queryByRole("checkbox")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Solicitar meu pagamento" }));
  await waitFor(() => expect(submitRepasseRequestEmpresa).toHaveBeenCalled());
  const form = vi.mocked(submitRepasseRequestEmpresa).mock.calls[0][1] as FormData;
  expect(form.getAll("entry_ids")).toEqual([entry.id]);
});
it("transferência usa o serviço escolhido e preenche saldo e data automaticamente", () => {
  render(React.createElement(SupplierFinanceCards, { entries: [{ ...entry, direction: "pagar" }] }));
  fireEvent.click(screen.getByRole("button", { name: /Já transferi à Nativos/ }));
  expect(screen.queryByRole("combobox", { name: /Serviço/ })).toBeNull();
  expect((screen.getByLabelText("Valor transferido à Nativos") as HTMLInputElement).value).toBe("500.00");
  expect((screen.getByLabelText("Data do pagamento") as HTMLInputElement).value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});
it("admin confere contexto e comprovante e confirma recebimento sem seletor de etapas", () => {
  render(React.createElement(RemittanceReviewCard, { request: { id: "request", protocol: "SOL-2026-000001", type: "pagamento_repasse_fornecedor", status: "solicitada", companyName: "Fornecedor exemplo", responseNote: null, details: { amount: 200, payment_date: "2020-01-01", payment_method: "pix", entry_id: entry.id } }, entries: [{ id: entry.id, reservationId: "reservation", reservation: entry.reservation, passenger: entry.passenger, service: entry.service, date: entry.date, driver: entry.driver, type: "receita", total: 700, balance: 500, eligible: true, cancelled: false }], bankAccounts: [{ id: "bank", name: "Conta principal" }], canReview: true }));
  expect(screen.getByText("Passageiro de exemplo")).toBeTruthy(); expect(screen.getByText(/Transferência informada/)).toBeTruthy();
  expect(screen.getByTitle("Comprovante enviado pelo fornecedor")).toBeTruthy();
  expect(screen.getByRole("button", { name: /Confirmar.*recebidos/ })).toBeTruthy();
  expect(screen.queryByPlaceholderText("Resposta ao solicitante")).toBeNull();
  expect(screen.getAllByRole("combobox")).toHaveLength(1);
  expect(screen.queryByText(entry.id)).toBeNull();
});

it("controle do fornecedor mostra recebimento, repasse, ganho e datas; formulário exige valor real", async () => {
  const { SupplierCustomerFinance } = await import("@/components/portal/supplier-customer-finance");
  render(React.createElement(SupplierCustomerFinance, { services: [{ id: "service", dedupeKey: "dedupe", reservation: "RES-2026-000002", passenger: "Passageiro", service: "Transfer", date: "14/10/2026", driver: "Motorista", expected: 380, received: 100, customerBalance: 280, supplierShare: 300, repasseTotal: 80, repassePaid: 20, repasseBalance: 60, gain: 20, legacyUnknown: false, completed: true, entryId: "entry", pendingProtocol: null, receipts: [{ amount: 100, date: "13/10/2026" }], remittances: [{ amount: 20, date: "14/10/2026" }] }] }));
  expect(screen.getByText("Você recebeu do passageiro")).toBeTruthy(); expect(screen.getByText("Você já repassou à Nativos")).toBeTruthy();
  expect(screen.getByText(/Recebido do passageiro:.*13\/10\/2026/)).toBeTruthy(); expect(screen.getByText(/Repasse confirmado à Nativos:.*14\/10\/2026/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Recebi do passageiro/ }));
  expect((screen.getByLabelText("Valor recebido agora do passageiro") as HTMLInputElement).value).toBe("280.00");
  expect(screen.getByLabelText("Data do recebimento do passageiro")).toBeTruthy();
});
