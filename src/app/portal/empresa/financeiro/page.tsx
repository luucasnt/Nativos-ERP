import { ArrowDownLeft, ArrowUpRight, FileText, WalletCards } from "lucide-react";
import { FinanceExtractTable } from "@/components/portal/finance-extract-table";
import { RepasseRequestForm } from "@/components/portal/repasse-request-form";
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

  const [supplierExtract, partnerExtract, repasseEntries, billingCycles] = await Promise.all([
    isSupplier ? getPartyFinanceExtract("fornecedor", company.id) : Promise.resolve([]),
    isPartner ? getPartyFinanceExtract("parceiro", company.id) : Promise.resolve([]),
    isSupplier
      ? prisma.financeEntry.findMany({
          where: {
            party_type: "fornecedor",
            party_id: company.id,
            status: "pendente",
            payment_eligible: true,
          },
          orderBy: { created_at: "desc" },
        })
      : Promise.resolve([]),
    isPartner
      ? prisma.billingCycle.findMany({
          where: { company_id: company.id },
          include: { _count: { select: { reservations: true } } },
          orderBy: { period: "desc" },
          take: 24,
        })
      : Promise.resolve([]),
  ]);

  const extract = [...supplierExtract, ...partnerExtract]
    .filter((entry, index, all) => all.findIndex((candidate) => candidate.id === entry.id) === index)
    .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

  const openEntries = extract.filter((entry) =>
    ["programado", "pendente", "vencido"].includes(entry.status),
  );
  const toReceive = openEntries
    .filter((entry) => entry.type === "despesa")
    .reduce((total, entry) => total + Number(entry.amount), 0);
  const toPay = openEntries
    .filter((entry) => entry.type === "receita")
    .reduce((total, entry) => total + Number(entry.amount), 0);
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

      {billingCycles.length > 0 && (
        <section className="surface-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-forest/10 px-5 py-4">
            <div>
              <h2 className="section-heading">Minhas faturas</h2>
              <p className="mt-1 text-xs text-forest/46">Ciclos de cobrança vinculados à empresa.</p>
            </div>
            <FileText size={18} className="text-gold" aria-hidden="true" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-sm">
              <thead>
                <tr>
                  <th className="bg-[#faf9f6] px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Período</th>
                  <th className="bg-[#faf9f6] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Reservas</th>
                  <th className="bg-[#faf9f6] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Total</th>
                  <th className="bg-[#faf9f6] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Pago</th>
                  <th className="bg-[#faf9f6] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Status</th>
                  <th className="bg-[#faf9f6] px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Documento</th>
                </tr>
              </thead>
              <tbody>
                {billingCycles.map((cycle) => (
                  <tr key={cycle.id} className="border-t border-forest/[0.075] hover:bg-forest/[0.022]">
                    <td className="px-5 py-3.5 text-xs font-semibold text-forest">{cycle.period}</td>
                    <td className="px-4 py-3.5 text-xs text-forest/55">{cycle._count.reservations}</td>
                    <td className="px-4 py-3.5 text-xs font-semibold text-forest">{money.format(Number(cycle.total_amount))}</td>
                    <td className="px-4 py-3.5 text-xs text-forest/55">{money.format(Number(cycle.paid_amount))}</td>
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
        </section>
      )}

      <section className="surface-panel overflow-hidden">
        <div className="border-b border-forest/10 px-5 py-4">
          <h2 className="section-heading">Extrato</h2>
          <p className="mt-1 text-xs text-forest/46">Histórico dos lançamentos vinculados à empresa.</p>
        </div>
        <div className="p-4 md:p-5">
          <FinanceExtractTable entries={extract} />
        </div>
      </section>

      {isSupplier && (
        <section className="surface-panel p-5">
          <h2 className="section-heading">Solicitar repasse</h2>
          <p className="mb-4 mt-1 text-xs leading-5 text-forest/46">
            Selecione lançamentos elegíveis e envie o pedido para a equipe financeira.
          </p>
          <RepasseRequestForm
            dedupeKey={crypto.randomUUID()}
            entries={repasseEntries.map((entry) => ({
              id: entry.id,
              label: (entry.description ?? entry.category) + " — " + money.format(Number(entry.amount)),
            }))}
            action={submitRepasseRequestEmpresa}
          />
        </section>
      )}
    </div>
  );
}

