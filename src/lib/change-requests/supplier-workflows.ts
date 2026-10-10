import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parsePaymentDate } from "@/lib/finance/payment-date";

export const supplierRemittanceSchema = z.object({
  entry_id: z.string().uuid(), amount: z.coerce.number().positive().finite(),
  payment_date: z.string(), payment_method: z.enum(["pix", "transferencia", "dinheiro", "cartao", "boleto", "outro"]),
  receipt_url: z.string().min(1), submitted_by_id: z.string().uuid(), nota: z.string().max(800).default(""),
});
export const driverAccessSchema = z.object({ driver_id: z.string().uuid(), email: z.string().email(), submitted_by_id: z.string().uuid() });

export async function supplierRemittanceEntry(entryId: string, companyId: string) {
  const entry = await prisma.financeEntry.findUniqueOrThrow({ where: { id: entryId }, include: { compensacao: true, payments: { where: { reversed_at: null, estorno_of_id: null } }, service: { include: { direct_collections: true } } } });
  if (entry.party_type !== "fornecedor" || entry.party_id !== companyId || entry.type !== "receita" || entry.category !== "repasse_fornecedor" || !entry.reservation_id || !entry.service || entry.service.supplier_id !== companyId || entry.service.collection_actor !== "fornecedor" || entry.service.execution_status !== "concluido" || !entry.service.direct_collections.some(c => c.status === "received" && !c.reversed_at && c.financial_responsible_id === companyId) || !entry.payment_eligible || !["pendente", "vencido"].includes(entry.status)) throw new Error("O repasse deve corresponder a um serviço concluído, recebido do passageiro e com saldo disponível da sua empresa.");
  const compensated = entry.compensacao?.status === "confirmada" && !entry.compensacao.reversed_at ? Number(entry.compensacao.amount) : 0;
  return { entry, balance: Math.max(0, Number(entry.amount) - compensated - entry.payments.reduce((sum, p) => sum + Number(p.amount), 0)) };
}
export function validateRemittanceAmount(amount: number, balance: number, date: string) {
  parsePaymentDate(date);
  if (Math.round(amount * 100) !== amount * 100 && Math.abs(Math.round(amount * 100) - amount * 100) > 0.000001) throw new Error("Informe um valor com até duas casas decimais.");
  if (Math.round(amount * 100) > Math.round(balance * 100)) throw new Error("O valor informado supera o saldo disponível para repasse.");
}
export async function supplierAccessDriver(driverId: string, companyId: string) {
  const driver = await prisma.driver.findUniqueOrThrow({ where: { id: driverId } });
  if (driver.supplier_id !== companyId || driver.owner_type !== "terceirizado" || driver.status !== "ativo" || driver.approval_status !== "aprovado") throw new Error("Selecione um motorista ativo e aprovado da sua empresa.");
  return driver;
}
