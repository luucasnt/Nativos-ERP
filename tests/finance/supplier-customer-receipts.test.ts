import { afterAll, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { PrismaClient } from "@prisma/client";
import { recordSupplierCustomerReceipt } from "@/lib/finance/supplier-customer-receipts";
import { generateServiceFinanceEntries, markServiceFinanceEntriesEligible } from "@/lib/finance/settlement";
import { createPayment } from "@/lib/finance/ledger";
import { supplierRemittanceEntry } from "@/lib/change-requests/supplier-workflows";
const db = new PrismaClient();
afterAll(() => db.$disconnect());
async function fixture(price = 380, cost = 300) {
  const company = await db.company.create({ data: { name: "Fornecedor recebimento real", roles: ["fornecedor"], direct_collection_settlement_mode: "gross_repass" } });
  const user = await db.user.create({ data: { email: `${crypto.randomUUID()}@teste.local`, auth_user_id: crypto.randomUUID(), account_type: "portal", linked_company_id: company.id } });
  const client = await db.client.create({ data: { name: "Passageiro recebimento" } });
  const reservation = await db.reservation.create({ data: { code: `CUSTOMER-${crypto.randomUUID()}`, client_id: client.id, collection_mode: "direto", status: "concluido" } });
  const service = await db.service.create({ data: { reservation_id: reservation.id, type: "transfer_saida", original_price: price, price, supplier_cost: cost, execution_type: "fornecedor", supplier_id: company.id, collection_actor: "fornecedor", acceptance_status: "aceito", execution_status: "concluido" } });
  await generateServiceFinanceEntries(service.id); await markServiceFinanceEntriesEligible(service.id);
  const entry = await db.financeEntry.findFirst({ where: { service_id: service.id, category: "repasse_fornecedor" } });
  const input = { serviceId: service.id, companyId: company.id, actorId: user.id, amount: price, paymentDate: "2020-01-01", dedupeKey: crypto.randomUUID() };
  return { company, user, reservation, service, entry, input };
}
it("R$380 do passageiro ficam fora do caixa; somente R$80 de repasse podem virar recebimento Nativos", async () => {
  const { service, entry, input } = await fixture();
  expect(entry?.amount.toFixed(2)).toBe("80.00");
  expect(await db.financeEntry.count({ where: { service_id: service.id, category: { in: ["venda_servico", "pagamento_fornecedor"] } } })).toBe(0);
  const receipt = await recordSupplierCustomerReceipt(input);
  expect(receipt.customer_amount?.toFixed(2)).toBe("380.00"); expect(receipt.occurred_at?.toISOString()).toBe("2020-01-01T03:00:00.000Z");
  expect(await db.payment.count({ where: { finance_entry_id: entry!.id } })).toBe(0);
  expect((await db.financeEntry.findUniqueOrThrow({ where: { id: entry!.id } })).status).toBe("pendente");
  expect((await recordSupplierCustomerReceipt(input)).id).toBe(receipt.id);
  expect(await db.auditLog.count({ where: { entity_id: service.id, action: "recebimento_passageiro_registrado_pelo_fornecedor" } })).toBe(1);
  await createPayment({ finance_entry_id: entry!.id, type: "recebimento", amount: 80, payment_method: "pix", occurred_at: new Date("2020-01-02T03:00:00Z"), dedupe_key: crypto.randomUUID() });
  const paid = await db.payment.aggregate({ where: { finance_entry_id: entry!.id }, _sum: { amount: true } });
  expect(paid._sum.amount?.toFixed(2)).toBe("80.00"); expect(receipt.customer_amount!.minus(paid._sum.amount!).toFixed(2)).toBe("300.00");
});
it("recebimentos parciais têm datas, não duplicam e limitam transferência ao valor disponível", async () => {
  const { input, entry, company, service } = await fixture();
  await recordSupplierCustomerReceipt({ ...input, amount: 50 });
  expect((await supplierRemittanceEntry(entry!.id, company.id)).balance).toBe(50);
  await recordSupplierCustomerReceipt({ ...input, amount: 100, paymentDate: "2020-01-02", dedupeKey: crypto.randomUUID() });
  expect((await supplierRemittanceEntry(entry!.id, company.id)).balance).toBe(80);
  await expect(recordSupplierCustomerReceipt({ ...input, amount: 231, dedupeKey: crypto.randomUUID() })).rejects.toThrow("saldo");
  await expect(recordSupplierCustomerReceipt({ ...input, amount: 51 })).rejects.toThrow("outros dados");
  expect(await db.directCollection.count({ where: { service_id: service.id } })).toBe(2);
  expect(await db.payment.count({ where: { finance_entry_id: entry!.id } })).toBe(0);
});
it("registro antigo com valor de repasse é preservado e valor explícito corrige a leitura sem refazer pagamento", async () => {
  const { service, company, entry, input } = await fixture();
  const legacy = await db.directCollection.create({ data: { service_id: service.id, receiver_type: "fornecedor", receiver_id: company.id, financial_responsible_type: "company", financial_responsible_id: company.id, status: "received", amount: 80, idempotency_key: `direct_collection:${service.id}` } });
  await createPayment({ finance_entry_id: entry!.id, type: "recebimento", amount: 80, payment_method: "pix", dedupe_key: crypto.randomUUID() });
  await recordSupplierCustomerReceipt(input);
  expect((await db.directCollection.findUniqueOrThrow({ where: { id: legacy.id } })).amount.toFixed(2)).toBe("80.00");
  expect(await db.payment.count({ where: { finance_entry_id: entry!.id } })).toBe(1);
  expect(await db.directCollection.count({ where: { service_id: service.id, customer_amount: { not: null } } })).toBe(1);
});
it("fornecedor sem repasse devido também registra recebimento e não gera venda nem caixa Nativos", async () => {
  const { input, service, entry } = await fixture(300, 300);
  expect(entry).toBeNull(); expect((await recordSupplierCustomerReceipt(input)).customer_amount?.toFixed(2)).toBe("300.00");
  expect(await db.financeEntry.count({ where: { service_id: service.id } })).toBe(0);
});
it("bloqueia outro fornecedor, valores fracionários inválidos, datas futuras e serviço não concluído", async () => {
  const { input, service } = await fixture();
  await expect(recordSupplierCustomerReceipt({ ...input, companyId: crypto.randomUUID() })).rejects.toThrow("sua empresa");
  await expect(recordSupplierCustomerReceipt({ ...input, amount: 1.234 })).rejects.toThrow("decimais");
  await expect(recordSupplierCustomerReceipt({ ...input, paymentDate: "2099-01-01" })).rejects.toThrow("futuro");
  await db.service.update({ where: { id: service.id }, data: { execution_status: "em_andamento" } });
  await expect(recordSupplierCustomerReceipt(input)).rejects.toThrow("concluído");
});
