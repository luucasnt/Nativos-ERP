import { Prisma, type FinanceEntry } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const moneyInput = z.string().trim()
  .regex(/^\d{1,10}([.,]\d{1,2})?$/, "Informe um valor válido com até duas casas decimais.")
  .transform((v) => v.replace(",", "."))
  .refine((v) => new Prisma.Decimal(v).gt(0), "Informe um valor maior que zero.");

export const manualEntrySchema = z.object({
  type: z.enum(["receita", "despesa"]),
  description: z.string().trim().min(2, "Descreva o lançamento.").max(1000),
  amount: moneyInput,
  due_date: z.string().date("Informe uma data válida.").optional().or(z.literal("")),
  party_type: z.enum(["cliente", "motorista", "fornecedor", "parceiro", "interno"]),
});

// Commissions also use origin_type=manual. Only the standalone records
// created by the existing manual form are editable in this screen.
export function isStandaloneManualEntry(entry: Pick<FinanceEntry, "origin_type" | "origin_id" | "auto_key" | "category" | "reservation_id" | "service_id" | "estorno_of_id">) {
  return entry.origin_type === "manual" && entry.origin_id === null && entry.category === "outro"
    && entry.reservation_id === null && entry.service_id === null && entry.estorno_of_id === null
    && Boolean(entry.auto_key?.startsWith("manual:"));
}

function assertEditable(entry: FinanceEntry & { _count: { payments: number; reversals: number } }) {
  if (!isStandaloneManualEntry(entry)) throw new Error("Edite o registro de origem deste lançamento na reserva ou no serviço.");
  if (entry.reversed_at || entry.status === "cancelado" || entry.status === "pago"
    || entry.compensacao_id || entry._count.payments || entry._count.reversals) {
    throw new Error("Este lançamento possui liquidação ou histórico de estorno e não pode ser editado ou excluído.");
  }
}

export async function createStandaloneManualEntry(input: z.infer<typeof manualEntrySchema>, actorId: string, key: string) {
  z.string().uuid().parse(key);
  return prisma.$transaction(async (tx) => {
    const duplicate = await tx.financeEntry.findUnique({ where: { auto_key: `manual:${key}` } });
    if (duplicate) return duplicate;
    const entry = await tx.financeEntry.create({ data: {
      ...input, due_date: input.due_date ? new Date(`${input.due_date}T12:00:00Z`) : null,
      category: "outro", origin_type: "manual", auto_key: `manual:${key}`,
      status: "pendente", payment_eligible: true,
    } });
    await tx.auditLog.create({ data: { actor_id: actorId, action: "lancamento_avulso_criado", entity_type: "finance_entry", entity_id: entry.id, metadata: { type: input.type, amount: input.amount } } });
    return entry;
  }, { isolationLevel: "Serializable" });
}

export async function updateStandaloneManualEntry(id: string, input: z.infer<typeof manualEntrySchema>, actorId: string, expectedUpdatedAt: string) {
  z.string().uuid().parse(id);
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM finance_entries WHERE id = ${id}::uuid FOR UPDATE`;
    const entry = await tx.financeEntry.findUniqueOrThrow({ where: { id }, include: { _count: { select: { payments: true, reversals: true } } } });
    assertEditable(entry);
    if (entry.updated_at.toISOString() !== expectedUpdatedAt) throw new Error("O lançamento mudou. Atualize a página antes de salvar.");
    await tx.financeEntry.update({ where: { id }, data: {
      ...input, due_date: input.due_date ? new Date(`${input.due_date}T12:00:00Z`) : null,
      // A party with a polymorphic id must not be reassigned silently.
      ...(entry.party_type !== input.party_type ? { party_id: null } : {}),
    } });
    await tx.auditLog.create({ data: { actor_id: actorId, action: "lancamento_avulso_atualizado", entity_type: "finance_entry", entity_id: id,
      metadata: { before: { type: entry.type, amount: entry.amount.toString(), description: entry.description, party_type: entry.party_type, due_date: entry.due_date?.toISOString() ?? null }, after: input } } });
  });
}

export async function cancelStandaloneManualEntry(id: string, reason: string, actorId: string) {
  z.string().uuid().parse(id);
  const note = z.string().trim().min(3, "Informe o motivo da exclusão.").max(1000).parse(reason);
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM finance_entries WHERE id = ${id}::uuid FOR UPDATE`;
    const entry = await tx.financeEntry.findUniqueOrThrow({ where: { id }, include: { _count: { select: { payments: true, reversals: true } } } });
    if (isStandaloneManualEntry(entry) && entry.status === "cancelado" && !entry.reversed_at) return;
    assertEditable(entry);
    await tx.financeEntry.update({ where: { id }, data: { status: "cancelado", payment_eligible: false } });
    await tx.auditLog.create({ data: { actor_id: actorId, action: "lancamento_avulso_cancelado", entity_type: "finance_entry", entity_id: id, metadata: { reason: note, amount: entry.amount.toString() } } });
  });
}
