import { requireFinancialUser } from "@/lib/auth/get-current-user";
import { ManualFinanceForm } from "./manual-finance-form";

export default async function NovoLancamentoPage() {
  await requireFinancialUser();
  return <div className="space-y-6"><header><p className="eyebrow">Financeiro</p><h1 className="page-heading mt-1">Novo lançamento avulso</h1><p className="page-description">Registre despesas, recebimentos ou retiradas que não pertencem a uma reserva.</p></header><ManualFinanceForm dedupeKey={crypto.randomUUID()} /></div>;
}
