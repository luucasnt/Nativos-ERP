import { ArrowDownLeft, ArrowUpRight, FileText, WalletCards } from "lucide-react";
import { FinanceExtractTable } from "@/components/portal/finance-extract-table";
import { RepasseRequestForm } from "@/components/portal/repasse-request-form";
import { InvoiceAdvanceForm } from "@/components/portal/invoice-advance-form";
import { InvoicePaymentForm } from "@/components/portal/invoice-payment-form";
import { MetricCard } from "@/components/ui/metric-card";
import { requireCompanyPortalUser } from "@/lib/auth/get-current-user";
import { getPartyFinanceExtract } from "@/lib/finance/party-extract";
import { prisma } from "@/lib/prisma";
import { submitRepasseRequestEmpresa } from "../actions";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default async function PortalEmpresaFinanceiroPage() {
  const user = await requireCompanyPortalUser();
  const company = user.linked_company;
  const isSupplier = company.roles.includes("fornecedor");
  const isPartner = company.roles.includes("parceiro");
  const isBilledPartner = isPartner && (company.billing_enabled || company.modelo_parceiro === "faturado" || company.modelo_parceiro === "ambos");

  const [supplierExtract, partnerExtract, repasseEntries, billingCycles] = await Promise.all([
    isSupplier ? getPartyFinanceExtract("fornecedor", company.id) : Promise.resolve([]),
    isPartner ? getPartyFinanceExtract("parceiro", company.id) : Promise.resolve([]),
    isSupplier
      ? prisma.financeEntry.findMany({
          where: {
            party_type: "fornecedor",
            party_id: company.id,
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
        })
      : Promise.resolve([]),
    isBilledPartner
      ? prisma.billingCycle.findMany({
          where: { company_id: company.id },
          include: { _count: { select: { reservations: true } } },
          orderBy: { period: "desc" },
          take: 24,
        })
      : Promise.resolve([]),
  ]);

  function dueDate(cycle: (typeof billingCycles)[number]) {
    const date = new Date(`${cycle.period}-01T12:00:00Z`);
    date.setUTCDate(Math.min(cycle.due_day, new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()));
    return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  }

  const extract = [...supplierExtract, ...partnerExtract]
    .filter((entry, index, all) => all.findIndex((candidate) => candidate.id === entry.id) === index)
    .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

  const openEntries = extract.filter((entry) =>
    ["programado", "pendente", "vencido"].includes(entry.status),
  );
  const openBalance = (entry: (typeof extract)[number]) => {
    const amount = Number(entry.amount);
    const compensated =
      entry.compensacao?.status === "confirmada" && !entry.compensacao.reversed_at
        ? Math.min(amount, Number(entry.compensacao.amount))
        : 0;
    const paid = entry.payments.reduce((total, payment) => total + Number(payment.amount), 0);
    return Math.max(0, amount - compensated - paid);
  };
  const toReceive = openEntries
    .filter((entry) => entry.type === "despesa")
    .reduce((total, entry) => total + openBalance(entry), 0);
  const toPay = openEntries
    .filter((entry) => entry.type === "receita")
    .reduce((total, entry) => total + openBalance(entry), 0);
  const settled = extract
    .filter((entry) => entry.status === "pago")
    .reduce((total, entry) => total + Number(entry.amount), 0);

  return (
    <div className="mx-auto max-w-[1360px] space-y-6">
      <header>
        <p className="eyebrow">Área reservada</p>
        <h1 className="page-heading mt-1">Financeiro</h1>
        <p className="page-description">Consulte lançamentos, repasses e faturas sem misturar com sua operação diária.</p>
      </header>

      <section aria-label="Resumo financeiro" className="grid gap-3 sm:grid-cols-3">
        <MetricCard icon={ArrowDownLeft} label="A receber da Nativos" value={money.format(toReceive)} accent="success" />
        <MetricCard icon={ArrowUpRight} label="A pagar à Nativos" value={money.format(toPay)} accent="warning" />
        <MetricCard icon={WalletCards} label="Movimentação liquidada" value={money.format(settled)} accent="forest" />
      </section>

      {isPartner && !isBilledPartner && (
        <section className="surface-panel border-l-4 border-l-gold p-5">
          <h2 className="section-heading">Modelo comissionado</h2>
          <p className="mt-1 text-sm leading-6 text-forest/65">Este parceiro não possui faturamento mensal. As comissões e os recebimentos diretos aplicáveis aparecem no extrato, sem gerar faturas.</p>
        </section>
      )}

      {isBilledPartner && (
        <section className="surface-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-forest/10 px-5 py-4">
            <div>
              <h2 className="section-heading">Minhas faturas</h2>
              <p className="mt-1 text-xs text-forest/58">Ciclos de cobrança vinculados à empresa.</p>
            </div>
            <FileText size={18} className="text-gold" aria-hidden="true" />
          </div>
          {billingCycles.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-forest/60">Nenhuma fatura emitida até o momento.</p>
          ) : (
            <>
              <ul className="grid gap-3 p-4 xl:hidden">
                {billingCycles.map((cycle) => (
                  <li key={cycle.id}>
                    <article className="rounded-xl border border-forest/10 bg-[#faf9f6] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-forest/55">Período</p>
                          <p className="mt-1 font-semibold text-forest">{cycle.period}</p>
                        </div>
                        <span className="rounded-full bg-forest/[0.07] px-2.5 py-1 text-[11px] font-semibold capitalize text-forest/65">
                          {cycle.status.replaceAll("_", " ")}
                        </span>
                      </div>
                      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                        <div>
                          <dt className="text-forest/55">Total</dt>
                          <dd className="mt-1 font-semibold text-forest">{money.format(Number(cycle.total_amount))}</dd>
                        </div>
                        <div>
                          <dt className="text-forest/55">Pago</dt>
                          <dd className="mt-1 font-semibold text-forest">{money.format(Number(cycle.paid_amount))}</dd>
                        </div>
                        <div>
                          <dt className="text-forest/55">Vencimento</dt>
                          <dd className="mt-1 font-semibold text-forest">{dueDate(cycle)}</dd>
                        </div>
                        <div>
                          <dt className="text-forest/55">Reservas</dt>
                          <dd className="mt-1 font-semibold text-forest">{cycle._count.reservations}</dd>
                        </div>
                      </dl>
                      <a
                        href={`/api/documentos/fatura/${cycle.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="focus-ring mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-forest/15 bg-white text-xs font-semibold text-forest active:bg-forest/5"
                      >
                        <FileText size={15} aria-hidden="true" />
                        Abrir fatura em PDF
                      </a>
                    </article>
                  </li>
                ))}
              </ul>

              <div className="hidden overflow-x-auto xl:block">
                <table className="w-full min-w-[650px] text-sm">
              <thead>
                <tr>
                  <th className="bg-[#faf9f6] px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-forest/55">Período</th>
                  <th className="bg-[#faf9f6] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-forest/55">Reservas</th>
                  <th className="bg-[#faf9f6] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-forest/55">Total</th>
                  <th className="bg-[#faf9f6] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-forest/55">Pago</th>
                  <th className="bg-[#faf9f6] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-forest/55">Vencimento</th>
                  <th className="bg-[#faf9f6] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-forest/55">Status</th>
                  <th className="bg-[#faf9f6] px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.1em] text-forest/55">Documento</th>
                </tr>
              </thead>
              <tbody>
                {billingCycles.map((cycle) => (
                  <tr key={cycle.id} className="border-t border-forest/[0.075] hover:bg-forest/[0.022]">
                    <td className="px-5 py-3.5 text-xs font-semibold text-forest">{cycle.period}</td>
                    <td className="px-4 py-3.5 text-xs text-forest/55">{cycle._count.reservations}</td>
                    <td className="px-4 py-3.5 text-xs font-semibold text-forest">{money.format(Number(cycle.total_amount))}</td>
                    <td className="px-4 py-3.5 text-xs text-forest/55">{money.format(Number(cycle.paid_amount))}</td>
                    <td className="px-4 py-3.5 text-xs text-forest/55">{dueDate(cycle)}</td>
                    <td className="px-4 py-3.5 text-xs capitalize text-forest/58">{cycle.status.replaceAll("_", " ")}</td>
                    <td className="px-5 py-3.5 text-right">
                      <a
                        href={"/api/documentos/fatura/" + cycle.id}
                        target="_blank"
                        rel="noreferrer"
                        className="focus-ring rounded text-xs font-semibold text-forest hover:text-forest-light"
                      >
                        Fatura PDF
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
                </table>
              </div>
            </>
          )}
          {billingCycles.filter((cycle) => ["aberto", "fechado", "parcialmente_pago", "vencido"].includes(cycle.status)).map((cycle) => {
            const remaining = Number(cycle.total_amount) - Number(cycle.paid_amount);
            return remaining > 0 ? (
              <div key={`forms-${cycle.id}`}>
              <InvoicePaymentForm cycleId={cycle.id} remaining={remaining} dedupeKey={crypto.randomUUID()} />
              <InvoiceAdvanceForm
                key={`advance-${cycle.id}`}
                cycleId={cycle.id}
                remaining={remaining}
                dedupeKey={crypto.randomUUID()}
              /></div>
            ) : null;
          })}
        </section>
      )}

      <section className="surface-panel overflow-hidden">
        <div className="border-b border-forest/10 px-5 py-4">
          <h2 className="section-heading">Extrato</h2>
          <p className="mt-1 text-xs text-forest/58">Histórico dos lançamentos vinculados à empresa.</p>
        </div>
        <div className="p-4 md:p-5">
          <FinanceExtractTable entries={extract} />
        </div>
      </section>

      {isSupplier && (
        <section className="surface-panel p-5">
          <h2 className="section-heading">Solicitar repasse</h2>
          <p className="mb-4 mt-1 text-xs leading-5 text-forest/58">
            Selecione lançamentos elegíveis e envie o pedido para a equipe financeira.
          </p>
          <RepasseRequestForm
            dedupeKey={crypto.randomUUID()}
          entries={repasseEntries.map((entry) => ({
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
            action={submitRepasseRequestEmpresa}
          />
        </section>
      )}
    </div>
  );
}
