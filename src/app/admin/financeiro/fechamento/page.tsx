import { CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireFinancialUser } from "@/lib/auth/get-current-user";
import { FinanceReasonAction } from "@/components/admin/finance-reason-action";
import { reopenDailyCash } from "./actions";
import { ClosingForm } from "./closing-form";

export default async function ClosingPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  await requireFinancialUser();
  const closings = await prisma.cashClosing.findMany({ include: { bank_account: true }, orderBy: { created_at: "desc" }, take: 30 });
  const { ok } = await searchParams;
  const accounts = await prisma.bankAccount.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  return <div className="space-y-6"><header><p className="eyebrow">Financeiro</p><h1 className="page-heading mt-1">Fechamento diário</h1><p className="page-description">Concilie o que entrou, saiu e o saldo contado em cada conta.</p></header>{ok === "1" && <div className="flex items-center gap-2 rounded-lg border border-success/20 bg-success-light px-4 py-3 text-sm text-success"><CheckCircle2 size={17} /> Fechamento registrado e disponível na auditoria.</div>}{accounts.length === 0 ? <div className="surface-panel p-6 text-sm text-forest/60">Cadastre uma conta bancária ou caixa antes de fechar o dia.</div> : <ClosingForm accounts={accounts} />}<section className="surface-panel space-y-4 p-5"><h2 className="section-heading">Últimos fechamentos</h2>{closings.length === 0 && <p className="text-sm text-forest/60">Nenhum fechamento registrado.</p>}{closings.map((closing) => <div key={closing.id} className="space-y-2 border-b border-forest/10 pb-3"><p className="text-sm">{closing.bank_account.name} · {closing.closing_date.toLocaleDateString("pt-BR", { timeZone: "America/Bahia" })} · Saldo teórico R$ {closing.theoretical_balance.toFixed(2)}</p>{closing.reopened_at ? <p className="text-xs text-forest/60">Reaberto: {closing.reopen_reason}</p> : <FinanceReasonAction label="Reabrir fechamento" explanation="Permite corrigir movimentações e registrar um novo fechamento. O histórico será preservado." onConfirm={reopenDailyCash.bind(null, closing.id)} />}</div>)}</section></div>;
}
