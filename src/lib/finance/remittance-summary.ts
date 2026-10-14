import type { Prisma } from "@prisma/client";
export const REMITTANCE_TYPES = ["pagamento_fornecedor", "pagamento_repasse_fornecedor", "repasse_nativos"];
export function requestEntryIds(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return [...new Set([value.entry_id, ...(Array.isArray(value.entry_ids) ? value.entry_ids : [])].filter((id): id is string => typeof id === "string" && /^[a-f0-9-]{36}$/.test(id)))];
}
export function financeBalance(entry: { amount: unknown; payments: { amount: unknown; reversed_at?: Date | null; estorno_of_id?: string | null }[]; compensacao: { amount: unknown; status: string; reversed_at: Date | null } | null }) {
  const total = Number(entry.amount);
  const paid = entry.payments.filter(p => !p.reversed_at && !p.estorno_of_id).reduce((sum, p) => sum + Number(p.amount), 0);
  const compensated = entry.compensacao?.status === "confirmada" && !entry.compensacao.reversed_at ? Math.min(total, Number(entry.compensacao.amount)) : 0;
  return Math.max(0, Math.round((total - paid - compensated) * 100) / 100);
}
