import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { supplierAccessDriver, supplierRemittanceEntry, validateRemittanceAmount } from "@/lib/change-requests/supplier-workflows";
import { generateServiceFinanceEntries } from "@/lib/finance/settlement";
import { markServiceFinanceEntriesEligible } from "@/lib/finance/settlement";
import { confirmDirectCollectionReceived } from "@/lib/finance/direct-collection";
import { createPayment } from "@/lib/finance/ledger";
const prisma = new PrismaClient();
afterAll(() => prisma.$disconnect());
describe("repasse do fornecedor com cobrança direta", () => {
  it("exige coleta confirmada e empresa correta; pagamentos parciais mantêm saldo, sem duplicar recebimento", async () => {
    const company = await prisma.company.create({ data: { name: "Fornecedor teste de repasse", roles: ["fornecedor"], recebe_pagamento_direto: true } });
    const client = await prisma.client.create({ data: { name: "Passageiro teste de repasse" } });
    const reservation = await prisma.reservation.create({ data: { code: `REP-${crypto.randomUUID()}`, client_id: client.id, collection_mode: "direto" } });
    const service = await prisma.service.create({ data: { reservation_id: reservation.id, type: "transfer_chegada", execution_type: "fornecedor", supplier_id: company.id, collection_actor: "fornecedor", supplier_cost: 300, original_price: 1000, price: 1000, acceptance_status: "aceito", execution_status: "concluido" } });
    await generateServiceFinanceEntries(service.id); await markServiceFinanceEntriesEligible(service.id);
    const entry = await prisma.financeEntry.findUniqueOrThrow({ where: { auto_key: `svc:${service.id}:repasse_fornecedor` } });
    await expect(supplierRemittanceEntry(entry.id, company.id)).rejects.toThrow("recebido");
    await confirmDirectCollectionReceived(service.id);
    await expect(supplierRemittanceEntry(entry.id, crypto.randomUUID())).rejects.toThrow("sua empresa");
    expect((await supplierRemittanceEntry(entry.id, company.id)).balance).toBe(700);
    const payment = { finance_entry_id: entry.id, type: "recebimento" as const, amount: 200, payment_method: "pix" as const, dedupe_key: `TEST-REP-${crypto.randomUUID()}` };
    const first = await createPayment(payment); expect((await createPayment(payment)).id).toBe(first.id);
    expect((await supplierRemittanceEntry(entry.id, company.id)).balance).toBe(500);
    expect((await prisma.financeEntry.findUniqueOrThrow({ where: { id: entry.id } })).status).toBe("pendente");
    expect(() => validateRemittanceAmount(501, 500, "2020-01-01")).toThrow("supera");
  });
  it("bloqueia acesso de motorista de outra empresa, inativo ou não aprovado", async () => {
    const company = await prisma.company.create({ data: { name: "Fornecedor acesso", roles: ["fornecedor"] } });
    const driver = await prisma.driver.create({ data: { name: "Motorista acesso", supplier_id: company.id, owner_type: "terceirizado", approval_status: "pendente" } });
    await expect(supplierAccessDriver(driver.id, company.id)).rejects.toThrow("aprovado");
    await prisma.driver.update({ where: { id: driver.id }, data: { approval_status: "aprovado" } });
    expect((await supplierAccessDriver(driver.id, company.id)).id).toBe(driver.id);
    await expect(supplierAccessDriver(driver.id, crypto.randomUUID())).rejects.toThrow("sua empresa");
    expect((await prisma.driver.findUniqueOrThrow({ where: { id: driver.id } })).payment_type).toBeNull();
  });
});
