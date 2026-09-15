import { ArrowDownLeft, CheckCircle2, WalletCards } from "lucide-react";
import { FinanceExtractTable } from "@/components/portal/finance-extract-table";
import { RepasseRequestForm } from "@/components/portal/repasse-request-form";
import { MetricCard } from "@/components/ui/metric-card";
import { requireDriverPortalUser } from "@/lib/auth/get-current-user";
import { getPartyFinanceExtract } from "@/lib/finance/party-extract";
import { prisma } from "@/lib/prisma";
import { submitRepasseRequestMotorista } from "../actions";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default async function PortalMotoristaFinanceiroPage() {
  const user = await requireDriverPortalUser();
  const driver = user.linked_driver;

  const [extract, eligibleEntries] = await Promise.all([
    getPartyFinanceExtract("motorista", driver.id),
    prisma.financeEntry.findMany({
      where: {
        party_type: "motorista",
        party_id: driver.id,
        type: "despesa",
        status: "pendente",
        payment_eligible: true,
      },
      orderBy: { created_at: "desc" },
      take: 100,
      include: {
        compensacao: { select: { amount: true, status: true, reversed_at: true } },
        payments: {
          where: { reversed_at: null, estorno_of_id: null },
          select: { amount: true },
        },
      },
    }),
  ]);

  const openAmount = extract
    .filter((entry) => ["programado", "pendente", "vencido"].includes(entry.status))
    .reduce((total, entry) => {
      const amount = Number(entry.amount);
      const compensated =
        entry.compensacao?.status === "confirmada" && !entry.compensacao.reversed_at
          ? Math.min(amount, Number(entry.compensacao.amount))
          : 0;
      const paid = entry.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
      return total + Math.max(0, amount - compensated - paid);
    }, 0);
  const paidAmount = extract
    .filter((entry) => entry.status === "pago")
    .reduce((total, entry) => total + Number(entry.amount), 0);

  return (
    <div className="mx-auto max-w-[1180px] space-y-6">
      <header>
        <p className="eyebrow">Área reservada</p>
        <h1 className="page-heading mt-1">Financeiro</h1>
        <p className="page-description">Acompanhe valores vinculados aos seus serviços e solicite repasses elegíveis.</p>
      </header>

      <section aria-label="Resumo financeiro" className="grid gap-3 sm:grid-cols-3">
        <MetricCard icon={ArrowDownLeft} label="Em aberto" value={money.format(openAmount)} accent="success" />
        <MetricCard icon={CheckCircle2} label="Liquidado" value={money.format(paidAmount)} accent="forest" />
        <MetricCard icon={WalletCards} label="Elegível para repasse" value={String(eligibleEntries.length)} accent="gold" />
      </section>

      <section className="surface-panel overflow-hidden">
        <div className="border-b border-forest/10 px-5 py-4">
          <h2 className="section-heading">Meu extrato</h2>
          <p className="mt-1 text-xs text-forest/58">Lançamentos vinculados ao seu cadastro.</p>
        </div>
        <div className="p-4 md:p-5">
          <FinanceExtractTable entries={extract} />
        </div>
      </section>

      <section className="surface-panel p-5">
        <h2 className="section-heading">Solicitar repasse</h2>
        <p className="mb-4 mt-1 text-xs leading-5 text-forest/58">
          Selecione os lançamentos e envie o pedido à equipe financeira.
        </p>
        <RepasseRequestForm
          dedupeKey={crypto.randomUUID()}
          entries={eligibleEntries.map((entry) => ({
            id: entry.id,
            label:
              (entry.description ?? entry.category) +
              " — saldo " +
              money.format(
                Math.max(
                  0,
                  Number(entry.amount) -
                    (entry.compensacao?.status === "confirmada" && !entry.compensacao.reversed_at
                      ? Math.min(Number(entry.amount), Number(entry.compensacao.amount))
                      : 0) -
                    entry.payments.reduce((total, payment) => total + Number(payment.amount), 0),
                ),
              ),
          }))}
          action={submitRepasseRequestMotorista}
        />
      </section>
    </div>
  );
}
