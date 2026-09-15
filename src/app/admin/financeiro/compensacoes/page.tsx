import { requireFinancialUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { CompensationForm } from "./compensation-form";

function balance(entry: { amount: unknown; payments: Array<{ amount: unknown }>; compensacao: { amount: unknown; status: string; reversed_at: Date | null } | null }) {
  const paid = entry.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const compensated = entry.compensacao?.status === "confirmada" && !entry.compensacao.reversed_at ? Number(entry.compensacao.amount) : 0;
  return Math.max(0, Number(entry.amount) - paid - compensated);
}

export default async function SupplierCompensationsPage() {
  await requireFinancialUser();
  const candidates = await prisma.financeEntry.findMany({
    where: { party_type: "fornecedor", type: { in: ["receita", "despesa"] }, status: { in: ["pendente", "vencido"] }, payment_eligible: true, reversed_at: null, compensacao_id: null },
    include: { payments: { where: { reversed_at: null, estorno_of_id: null }, select: { amount: true } }, compensacao: { select: { amount: true, status: true, reversed_at: true } }, reservation: { select: { code: true } }, service: { select: { id: true } } },
    orderBy: { created_at: "asc" },
    take: 200,
  });
  const supplierIds = [...new Set(candidates.map((entry) => entry.party_id).filter((id): id is string => Boolean(id)))];
  const suppliers = await prisma.company.findMany({ where: { id: { in: supplierIds } }, select: { id: true, name: true } });
  const supplierNames = new Map(suppliers.map((supplier) => [supplier.id, supplier.name]));
  const toOption = (entry: (typeof candidates)[number]) => ({ id: entry.id, balance: balance(entry), label: `${supplierNames.get(entry.party_id ?? "") ?? "Fornecedor"} · ${entry.reservation?.code ?? "Sem reserva"}` });
  const payables = candidates.filter((entry) => entry.type === "despesa").map(toOption).filter((entry) => entry.balance > 0);
  const receivables = candidates.filter((entry) => entry.type === "receita").map(toOption).filter((entry) => entry.balance > 0);

  return <div className="mx-auto max-w-[1180px] space-y-6">
    <header><p className="eyebrow">Liquidação financeira</p><h1 className="page-heading mt-1">Compensar fornecedor</h1><p className="page-description">Encontre uma conta a pagar e uma conta a receber do mesmo fornecedor para liquidar apenas a diferença.</p></header>
    <section className="surface-panel p-5"><h2 className="section-heading">Nova compensação</h2><p className="mb-4 mt-1 text-xs leading-5 text-forest/58">Exemplo: Nativos deve R$ 200 e o fornecedor deve R$ 300. Compense R$ 200 e o saldo a receber será R$ 100.</p><CompensationForm payables={payables} receivables={receivables} /></section>
  </div>;
}
