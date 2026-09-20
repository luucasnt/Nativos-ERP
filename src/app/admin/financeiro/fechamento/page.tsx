import { CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ClosingForm } from "./closing-form";

export default async function ClosingPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;
  const accounts = await prisma.bankAccount.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  return <div className="space-y-6"><header><p className="eyebrow">Financeiro</p><h1 className="page-heading mt-1">Fechamento diário</h1><p className="page-description">Concilie o que entrou, saiu e o saldo contado em cada conta.</p></header>{ok === "1" && <div className="flex items-center gap-2 rounded-lg border border-success/20 bg-success-light px-4 py-3 text-sm text-success"><CheckCircle2 size={17} /> Fechamento registrado e disponível na auditoria.</div>}{accounts.length === 0 ? <div className="surface-panel p-6 text-sm text-forest/60">Cadastre uma conta bancária ou caixa antes de fechar o dia.</div> : <ClosingForm accounts={accounts} />}</div>;
}
