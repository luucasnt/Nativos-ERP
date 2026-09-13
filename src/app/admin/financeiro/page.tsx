import Link from "next/link";
import type { FinanceEntryStatus, FinanceEntryType, Prisma } from "@prisma/client";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  FileText,
  Landmark,
  Search,
  TrendingUp,
} from "lucide-react";
import { FinanceCashflowChart, type CashflowPoint } from "@/components/admin/finance-cashflow-chart";
import { RegisterPaymentForm } from "@/components/admin/register-payment-form";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/ui/metric-card";
import {
  FINANCE_ENTRY_CATEGORY_LABEL,
  FINANCE_ENTRY_STATUS_LABEL,
  FINANCE_ENTRY_TYPE_LABEL,
  FINANCE_PARTY_TYPE_LABEL,
} from "@/lib/finance/labels";
import { prisma } from "@/lib/prisma";
import { inputClass, secondaryButtonClass } from "@/lib/ui";
import { registerPayment } from "./actions";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const PERIOD_DAYS = {
  "30": 30,
  "90": 90,
  "365": 365,
} as const;

const VALID_STATUS = new Set<FinanceEntryStatus>([
  "programado",
  "pendente",
  "pago",
  "vencido",
  "cancelado",
]);

const VALID_TYPE = new Set<FinanceEntryType>(["receita", "despesa"]);

type FinanceView = "geral" | "receber" | "pagar" | "faturas";

const VIEWS: Array<{ key: FinanceView; label: string }> = [
  { key: "geral", label: "Visão geral" },
  { key: "receber", label: "Contas a receber" },
  { key: "pagar", label: "Contas a pagar" },
  { key: "faturas", label: "Faturas" },
];

function parsePeriod(value: string | undefined) {
  return value && value in PERIOD_DAYS ? (value as keyof typeof PERIOD_DAYS) : "30";
}
function parseView(value: string | undefined): FinanceView {
  return VIEWS.some((item) => item.key === value) ? (value as FinanceView) : "geral";
}

function statusTone(status: FinanceEntryStatus): "success" | "danger" | "warning" | "neutral" {
  if (status === "pago") return "success";
  if (status === "vencido") return "danger";
  if (status === "pendente") return "warning";
  return "neutral";
}

function invoiceTone(status: string): "success" | "danger" | "warning" | "info" | "neutral" {
  if (status === "pago") return "success";
  if (status === "vencido") return "danger";
  if (status === "parcialmente_pago") return "warning";
  if (status === "faturado") return "info";
  return "neutral";
}

function invoiceStatusLabel(status: string) {
  const labels: Record<string, string> = {
    aberto: "Em aberto",
    fechado: "Fechado",
    faturado: "Faturado",
    parcialmente_pago: "Parcialmente pago",
    pago: "Pago",
    vencido: "Vencido",
  };
  return labels[status] ?? status;
}

function groupCashflow(
  entries: Array<{
    created_at: Date;
    type: FinanceEntryType;
    amount: { toString(): string };
    status: FinanceEntryStatus;
  }>,
  days: number,
): CashflowPoint[] {
  const groupSize = days > 100 ? 30 : days > 45 ? 7 : 1;
  const groups = new Map<string, { date: Date; receitas: number; despesas: number }>();

  for (const entry of entries) {
    if (entry.status === "cancelado") continue;
    const date = new Date(entry.created_at);
    date.setUTCHours(0, 0, 0, 0);
    if (groupSize > 1) {
      const day = date.getUTCDate();
      date.setUTCDate(day - ((day - 1) % groupSize));
    }
    const key = date.toISOString().slice(0, 10);
    const current = groups.get(key) ?? { date, receitas: 0, despesas: 0 };
    if (entry.type === "receita") current.receitas += Number(entry.amount);
    else current.despesas += Number(entry.amount);
    groups.set(key, current);
  }

  return [...groups.values()]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((item) => ({
      label: item.date.toLocaleDateString("pt-BR", {
        timeZone: "UTC",
        day: "2-digit",
        month: "short",
      }),
      receitas: item.receitas,
      despesas: item.despesas,
      resultado: item.receitas - item.despesas,
    }));
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    period?: string;
    type?: string;
    status?: string;
    q?: string;
  }>;
}) {
  const params = await searchParams;
  const view = parseView(params.view);
  const period = parsePeriod(params.period);
  const days = PERIOD_DAYS[period];
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - days);
  from.setUTCHours(0, 0, 0, 0);

  const selectedType = VALID_TYPE.has(params.type as FinanceEntryType)
    ? (params.type as FinanceEntryType)
    : view === "receber"
      ? "receita"
      : view === "pagar"
        ? "despesa"
        : undefined;
  const selectedStatus = VALID_STATUS.has(params.status as FinanceEntryStatus)
    ? (params.status as FinanceEntryStatus)
    : undefined;
  const query = params.q?.trim() ?? "";

  const entryWhere: Prisma.FinanceEntryWhereInput = {
    created_at: { gte: from },
    ...(selectedType ? { type: selectedType } : {}),
    ...(selectedStatus ? { status: selectedStatus } : {}),
  };

  if (query) {
    entryWhere.OR = [
      { description: { contains: query, mode: "insensitive" } },
      { reservation: { is: { code: { contains: query, mode: "insensitive" } } } },
    ];
  }

  const now = new Date();
  const nextDueLimit = new Date(now);
  nextDueLimit.setUTCDate(nextDueLimit.getUTCDate() + 45);

  const [summaryEntries, entries, upcomingDue, billingCycles] = await Promise.all([
    prisma.financeEntry.findMany({
      where: { created_at: { gte: from } },
      select: { type: true, amount: true, status: true, created_at: true },
    }),
    prisma.financeEntry.findMany({
      where: entryWhere,
      orderBy: { created_at: "desc" },
      take: 250,
      include: {
        reservation: { include: { client: true } },
        service: true,
        payments: {
          where: { reversed_at: null },
          orderBy: { created_at: "desc" },
          take: 1,
        },
      },
    }),
    prisma.financeEntry.findMany({
      where: {
        due_date: { gte: now, lte: nextDueLimit },
        status: { in: ["programado", "pendente"] },
      },
      orderBy: { due_date: "asc" },
      take: 6,
      include: { reservation: { include: { client: true } } },
    }),
    prisma.billingCycle.findMany({
      orderBy: [{ period: "desc" }, { created_at: "desc" }],
      take: 40,
      include: {
        company: true,
        reservations: {
          include: {
            reservation: {
              include: {
                client: true,
                services: { where: { execution_status: { not: "cancelado" } } },
              },
            },
          },
        },
      },
    }),
  ]);

  const companyIds = new Set<string>();
  const driverIds = new Set<string>();
  for (const entry of entries) {
    if (!entry.party_id) continue;
    if (entry.party_type === "fornecedor" || entry.party_type === "parceiro") {
      companyIds.add(entry.party_id);
    } else if (entry.party_type === "motorista") {
      driverIds.add(entry.party_id);
    }
  }

  const [companies, drivers] = await Promise.all([
    prisma.company.findMany({
      where: { id: { in: [...companyIds] } },
      select: { id: true, name: true },
    }),
    prisma.driver.findMany({
      where: { id: { in: [...driverIds] } },
      select: { id: true, name: true },
    }),
  ]);

  const companyNameById = new Map(companies.map((company) => [company.id, company.name]));
  const driverNameById = new Map(drivers.map((driver) => [driver.id, driver.name]));

  function partyName(entry: (typeof entries)[number]) {
    switch (entry.party_type) {
      case "cliente":
        return entry.reservation?.client.name ?? "—";
      case "fornecedor":
      case "parceiro":
        return (entry.party_id && companyNameById.get(entry.party_id)) ?? "—";
      case "motorista":
        return (entry.party_id && driverNameById.get(entry.party_id)) ?? "—";
      case "pessoa_fisica":
        return entry.reservation?.referrer_name ?? "—";
      case "interno":
        return "Nativos";
      default:
        return "—";
    }
  }

  const totals = summaryEntries.reduce(
    (result, entry) => {
      if (entry.status === "cancelado") return result;
      const amount = Number(entry.amount);
      if (entry.type === "receita") {
        result.revenue += amount;
        if (["pendente", "programado", "vencido"].includes(entry.status)) {
          result.receivable += amount;
        }
      } else {
        result.expense += amount;
        if (["pendente", "programado", "vencido"].includes(entry.status)) {
          result.payable += amount;
        }
      }
      if (entry.status === "vencido") result.overdue += amount;
      return result;
    },
    { revenue: 0, expense: 0, receivable: 0, payable: 0, overdue: 0 },
  );

  const chartData = groupCashflow(summaryEntries, days);

  return (
    <div className="mx-auto max-w-[1480px] space-y-6">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="eyebrow">Gestão financeira</p>
          <h1 className="page-heading mt-1">Financeiro</h1>
          <p className="page-description">
            Acompanhe entradas, saídas, vencimentos e faturamento sem misturar com a operação.
          </p>
        </div>
        <form className="flex items-center gap-2" action="/admin/financeiro" method="get">
          <input type="hidden" name="view" value={view} />
          <label htmlFor="period" className="sr-only">Período</label>
          <select
            id="period"
            name="period"
            defaultValue={period}
            className="focus-ring h-10 rounded-lg border border-forest/12 bg-white px-3 text-xs font-medium text-forest outline-none"
          >
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="365">Últimos 12 meses</option>
          </select>
          <button type="submit" className={secondaryButtonClass}>Aplicar</button>
        </form>
      </header>

      <nav aria-label="Áreas do financeiro" className="flex gap-1 overflow-x-auto border-b border-forest/10">
        {VIEWS.map((item) => (
          <Link
            key={item.key}
            href={"/admin/financeiro?view=" + item.key + "&period=" + period}
            aria-current={view === item.key ? "page" : undefined}
            className={
              "focus-ring relative shrink-0 px-3 pb-3 pt-1 text-xs font-medium transition " +
              (view === item.key ? "text-forest" : "text-forest/48 hover:text-forest")
            }
          >
            {item.label}
            {view === item.key && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-gold" />}
          </Link>
        ))}
      </nav>

      <section aria-label="Resumo financeiro" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={ArrowDownLeft}
          label="A receber"
          value={money.format(totals.receivable)}
          accent="success"
          trend={{ direction: totals.receivable > 0 ? "up" : "flat", label: "em lançamentos abertos", tone: "neutral" }}
        />
        <MetricCard
          icon={ArrowUpRight}
          label="A pagar"
          value={money.format(totals.payable)}
          accent="danger"
          trend={{ direction: totals.payable > 0 ? "up" : "flat", label: "em lançamentos abertos", tone: "neutral" }}
        />
        <MetricCard
          icon={AlertCircle}
          label="Vencido"
          value={money.format(totals.overdue)}
          accent={totals.overdue > 0 ? "danger" : "success"}
          trend={{ direction: totals.overdue > 0 ? "up" : "flat", label: totals.overdue > 0 ? "requer conciliação" : "sem atrasos", tone: totals.overdue > 0 ? "negative" : "positive" }}
        />
        <MetricCard
          icon={TrendingUp}
          label="Resultado projetado"
          value={money.format(totals.revenue - totals.expense)}
          accent={totals.revenue - totals.expense >= 0 ? "gold" : "warning"}
          trend={{ direction: totals.revenue - totals.expense >= 0 ? "up" : "down", label: "período de " + days + " dias", tone: totals.revenue - totals.expense >= 0 ? "positive" : "negative" }}
        />
      </section>

      {view === "faturas" ? (
        <section className="surface-panel overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-forest/10 px-5 py-4">
            <div>
              <h2 className="section-heading">Faturas por parceiro</h2>
              <p className="mt-1 text-xs text-forest/46">Ciclos de cobrança consolidados no sistema.</p>
            </div>
            <FileText size={18} className="text-gold" aria-hidden="true" />
          </div>
          {billingCycles.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <FileText className="mx-auto text-forest/22" size={30} aria-hidden="true" />
              <p className="mt-3 text-sm font-medium text-forest">Nenhuma fatura criada</p>
              <p className="mt-1 text-xs text-forest/46">Os ciclos aparecerão aqui quando forem fechados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr>
                    <th className="bg-[#faf9f6] px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Parceiro</th>
                    <th className="bg-[#faf9f6] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Período</th>
                    <th className="bg-[#faf9f6] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Reservas</th>
                    <th className="bg-[#faf9f6] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Total</th>
                    <th className="bg-[#faf9f6] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Pago</th>
                    <th className="bg-[#faf9f6] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Status</th>
                    <th className="bg-[#faf9f6] px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {billingCycles.map((cycle) => (
                    <tr key={cycle.id} className="border-t border-forest/[0.075] hover:bg-forest/[0.022]">
                      <td className="px-5 py-3.5 font-medium text-ink">{cycle.company.name}</td>
                      <td className="px-4 py-3.5 text-forest/64">{cycle.period}</td>
                      <td className="px-4 py-3.5 text-forest/64">{cycle.reservations.length}</td>
                      <td className="px-4 py-3.5 font-semibold text-forest">{money.format(Number(cycle.total_amount))}</td>
                      <td className="px-4 py-3.5 text-forest/64">{money.format(Number(cycle.paid_amount))}</td>
                      <td className="px-4 py-3.5">
                        <Badge tone={invoiceTone(cycle.status)}>{invoiceStatusLabel(cycle.status)}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <a
                          href={"/api/documentos/fatura/" + cycle.id}
                          target="_blank"
                          rel="noreferrer"
                          className="focus-ring inline-flex items-center gap-1 rounded text-xs font-semibold text-forest hover:text-forest-light"
                        >
                          Gerar PDF
                          <ArrowRight size={13} aria-hidden="true" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        <>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.55fr)]">
            <section className="surface-panel min-w-0 p-5">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="section-heading">Fluxo do período</h2>
                  <p className="mt-1 text-xs text-forest/46">Receitas, despesas e resultado dos lançamentos.</p>
                </div>
                <Landmark size={18} className="text-gold" aria-hidden="true" />
              </div>
              <FinanceCashflowChart data={chartData} />
            </section>

            <section className="surface-panel overflow-hidden">
              <div className="flex items-center justify-between border-b border-forest/10 px-5 py-4">
                <div>
                  <h2 className="section-heading">Próximos vencimentos</h2>
                  <p className="mt-1 text-xs text-forest/46">Agenda dos próximos 45 dias.</p>
                </div>
                <CalendarClock size={18} className="text-gold" aria-hidden="true" />
              </div>
              {upcomingDue.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-forest/46">Nenhum vencimento programado.</p>
              ) : (
                <ul className="divide-y divide-forest/[0.075]">
                  {upcomingDue.map((entry) => (
                    <li key={entry.id} className="flex items-center gap-3 px-5 py-3.5">
                      <span className="min-w-11 rounded-lg bg-forest/[0.055] px-2 py-1.5 text-center">
                        <strong className="block text-xs text-forest">
                          {entry.due_date?.toLocaleDateString("pt-BR", { timeZone: "UTC", day: "2-digit" })}
                        </strong>
                        <span className="block text-[9px] uppercase text-forest/42">
                          {entry.due_date?.toLocaleDateString("pt-BR", { timeZone: "UTC", month: "short" })}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-xs text-ink">
                          {entry.reservation?.client.name ?? FINANCE_ENTRY_CATEGORY_LABEL[entry.category] ?? entry.category}
                        </strong>
                        <span className="mt-1 block truncate text-[11px] text-forest/45">
                          {FINANCE_ENTRY_TYPE_LABEL[entry.type]} · {entry.reservation?.code ?? "Sem reserva"}
                        </span>
                      </span>
                      <strong className={"text-xs " + (entry.type === "receita" ? "text-success" : "text-danger")}>
                        {money.format(Number(entry.amount))}
                      </strong>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="surface-panel overflow-hidden">
            <div className="border-b border-forest/10 px-5 py-4">
              <h2 className="section-heading">Lançamentos</h2>
              <p className="mt-1 text-xs text-forest/46">Últimos 250 registros conforme os filtros.</p>
            </div>

            <form action="/admin/financeiro" method="get" className="grid gap-2 border-b border-forest/10 bg-[#faf9f6] p-3 md:grid-cols-[minmax(220px,1fr)_160px_170px_auto]">
              <input type="hidden" name="view" value={view} />
              <input type="hidden" name="period" value={period} />
              <label className="relative">
                <span className="sr-only">Buscar lançamento</span>
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-forest/38" aria-hidden="true" />
                <input
                  name="q"
                  defaultValue={query}
                  placeholder="Reserva ou descrição"
                  className={inputClass + " pl-9"}
                />
              </label>
              <select name="type" defaultValue={selectedType ?? ""} className={inputClass}>
                <option value="">Todos os tipos</option>
                <option value="receita">Receitas</option>
                <option value="despesa">Despesas</option>
              </select>
              <select name="status" defaultValue={selectedStatus ?? ""} className={inputClass}>
                <option value="">Todos os status</option>
                {["programado", "pendente", "pago", "vencido", "cancelado"].map((status) => (
                  <option key={status} value={status}>{FINANCE_ENTRY_STATUS_LABEL[status]}</option>
                ))}
              </select>
              <button type="submit" className={secondaryButtonClass}>Filtrar</button>
            </form>

            {entries.length === 0 ? (
              <p className="px-5 py-14 text-center text-sm text-forest/46">Nenhum lançamento encontrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-sm">
                  <thead>
                    <tr>
                      <th className="bg-white px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Data</th>
                      <th className="bg-white px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Descrição</th>
                      <th className="bg-white px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Contraparte</th>
                      <th className="bg-white px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Reserva</th>
                      <th className="bg-white px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Valor</th>
                      <th className="bg-white px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Status</th>
                      <th className="bg-white px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.id} className="border-t border-forest/[0.075] align-middle transition hover:bg-forest/[0.022]">
                        <td className="px-5 py-3.5 text-xs text-forest/55">
                          {entry.created_at.toLocaleDateString("pt-BR", { timeZone: "America/Bahia" })}
                        </td>
                        <td className="max-w-[280px] px-4 py-3.5">
                          <p className="truncate text-xs font-medium text-ink">
                            {entry.description ?? FINANCE_ENTRY_CATEGORY_LABEL[entry.category] ?? entry.category}
                          </p>
                          <p className="mt-1 text-[10px] text-forest/42">{FINANCE_ENTRY_CATEGORY_LABEL[entry.category]}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-xs text-ink/78">{partyName(entry)}</p>
                          <p className="mt-1 text-[10px] text-forest/42">{FINANCE_PARTY_TYPE_LABEL[entry.party_type]}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          {entry.reservation ? (
                            <Link href={"/admin/reservas/" + entry.reservation.id} className="focus-ring rounded text-xs font-semibold text-forest hover:text-forest-light">
                              {entry.reservation.code}
                            </Link>
                          ) : (
                            <span className="text-forest/35">—</span>
                          )}
                        </td>
                        <td className={"px-4 py-3.5 text-xs font-semibold " + (entry.type === "receita" ? "text-success" : "text-danger")}>
                          {entry.type === "receita" ? "+" : "−"} {money.format(Number(entry.amount))}
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge tone={statusTone(entry.status)}>
                            {FINANCE_ENTRY_STATUS_LABEL[entry.status]}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          {entry.payment_eligible && entry.status === "pendente" && (
                            <RegisterPaymentForm entryId={entry.id} onRegister={registerPayment} />
                          )}
                          {entry.status === "pago" && entry.payments[0] && (
                            <a
                              href={"/api/documentos/recibo/" + entry.payments[0].id}
                              target="_blank"
                              rel="noreferrer"
                              className="focus-ring inline-flex items-center gap-1 rounded text-xs font-semibold text-forest hover:text-forest-light"
                            >
                              Recibo
                              <ArrowRight size={12} aria-hidden="true" />
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
