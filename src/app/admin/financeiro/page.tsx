import Link from "next/link";
import { Prisma, type FinanceEntryStatus, type FinanceEntryType } from "@prisma/client";
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
import { requireFinancialUser } from "@/lib/auth/get-current-user";

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

function activeCompensationAmount(entry: {
  amount: Prisma.Decimal;
  compensacao: { amount: Prisma.Decimal; status: string; reversed_at: Date | null } | null;
}) {
  if (entry.compensacao?.status !== "confirmada" || entry.compensacao.reversed_at) return 0;
  return Math.min(Number(entry.amount), Number(entry.compensacao.amount));
}

function activePaymentAmount(entry: { payments: Array<{ amount: Prisma.Decimal }> }) {
  return entry.payments.reduce((total, payment) => total + Number(payment.amount), 0);
}

type CashflowAggregate = {
  bucket: Date;
  type: FinanceEntryType;
  amount: Prisma.Decimal;
};

type FinancialSummaryAggregate = {
  type: FinanceEntryType;
  status: FinanceEntryStatus;
  amount: Prisma.Decimal;
};

type OverdueAggregate = {
  type: FinanceEntryType;
  amount: Prisma.Decimal;
};

function groupCashflow(
  entries: CashflowAggregate[],
  days: number,
): CashflowPoint[] {
  const groups = new Map<string, { date: Date; receitas: number; despesas: number }>();

  for (const entry of entries) {
    const date = new Date(entry.bucket);
    const key = date.toISOString();
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
        ...(days > 100 ? { month: "short", year: "2-digit" } : { day: "2-digit", month: "short" }),
      }),
      receitas: item.receitas,
      despesas: item.despesas,
      resultado: item.receitas - item.despesas,
    }));
}

/*
 * O gráfico recebe dados já agregados no Postgres. Assim o navegador e a
 * função serverless não precisam carregar cada lançamento do período.
 */
function cashflowBucket(days: number) {
  if (days > 100) return "month";
  if (days > 45) return "week";
  return "day";
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
  await requireFinancialUser();
  const view = parseView(params.view);
  const period = parsePeriod(params.period);
  const days = PERIOD_DAYS[period];
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - days);
  from.setUTCHours(0, 0, 0, 0);

  const selectedType = view === "receber"
    ? "receita"
    : view === "pagar"
      ? "despesa"
      : VALID_TYPE.has(params.type as FinanceEntryType)
        ? (params.type as FinanceEntryType)
        : undefined;
  const selectedStatus = VALID_STATUS.has(params.status as FinanceEntryStatus)
    ? (params.status as FinanceEntryStatus)
    : undefined;
  const query = params.q?.trim() ?? "";

  const now = new Date();
  const entryWhere: Prisma.FinanceEntryWhereInput = {
    created_at: { gte: from },
    ...(selectedType ? { type: selectedType } : {}),
  };

  if (selectedStatus === "vencido") {
    entryWhere.OR = [
      { status: "vencido" },
      { status: { in: ["programado", "pendente"] }, due_date: { lt: now } },
    ];
  } else if (selectedStatus) {
    entryWhere.status = selectedStatus;
  }

  if (query) {
    const searchConditions: Prisma.FinanceEntryWhereInput[] = [
      { description: { contains: query, mode: "insensitive" } },
      { reservation: { is: { code: { contains: query, mode: "insensitive" } } } },
    ];
    entryWhere.AND = [{ OR: searchConditions }];
  }

  const nextDueLimit = new Date(now);
  nextDueLimit.setUTCDate(nextDueLimit.getUTCDate() + 45);

  const [summaryGroups, overdueSummary, chartEntries, entries, upcomingDue, billingCycles, bankAccounts] = await Promise.all([
    prisma.$queryRaw<FinancialSummaryAggregate[]>(Prisma.sql`
      SELECT
        entry."type",
        entry."status",
        SUM(
          CASE
            WHEN entry."status" IN ('programado', 'pendente', 'vencido') THEN
              GREATEST(
                entry."amount" - CASE
                  WHEN compensation."status" = 'confirmada' AND compensation."reversed_at" IS NULL
                    THEN LEAST(entry."amount", compensation."amount")
                  ELSE 0
                END - COALESCE(active_payment."amount", 0),
                0
              )
            ELSE entry."amount"
          END
        ) AS "amount"
      FROM "public"."finance_entries" AS entry
      LEFT JOIN "public"."compensations" AS compensation ON compensation."id" = entry."compensacao_id"
      LEFT JOIN LATERAL (
        SELECT SUM(payment."amount") AS "amount"
        FROM "public"."payments" AS payment
        WHERE payment."finance_entry_id" = entry."id"
          AND payment."reversed_at" IS NULL
          AND payment."estorno_of_id" IS NULL
      ) AS active_payment ON true
      WHERE entry."reversed_at" IS NULL AND entry."status" <> 'cancelado'
      GROUP BY entry."type", entry."status"
    `),
    prisma.$queryRaw<OverdueAggregate[]>(Prisma.sql`
      SELECT
        entry."type",
        SUM(
          GREATEST(
            entry."amount" - CASE
              WHEN compensation."status" = 'confirmada' AND compensation."reversed_at" IS NULL
                THEN LEAST(entry."amount", compensation."amount")
              ELSE 0
            END - COALESCE(active_payment."amount", 0),
            0
          )
        ) AS "amount"
      FROM "public"."finance_entries" AS entry
      LEFT JOIN "public"."compensations" AS compensation ON compensation."id" = entry."compensacao_id"
      LEFT JOIN LATERAL (
        SELECT SUM(payment."amount") AS "amount"
        FROM "public"."payments" AS payment
        WHERE payment."finance_entry_id" = entry."id"
          AND payment."reversed_at" IS NULL
          AND payment."estorno_of_id" IS NULL
      ) AS active_payment ON true
      WHERE entry."reversed_at" IS NULL
        AND entry."status" IN ('programado', 'pendente', 'vencido')
        AND entry."due_date" < ${now}
      GROUP BY entry."type"
    `),
    prisma.$queryRaw<CashflowAggregate[]>(Prisma.sql`
      SELECT
        date_trunc(${cashflowBucket(days)}, "created_at") AS "bucket",
        "type",
        SUM("amount") AS "amount"
      FROM "public"."finance_entries"
      WHERE "created_at" >= ${from}
        AND "status" <> 'cancelado'
      GROUP BY 1, 2
      ORDER BY 1 ASC
    `),
    prisma.financeEntry.findMany({
      where: entryWhere,
      orderBy: { created_at: "desc" },
      take: 50,
      include: {
        reservation: { include: { client: true } },
        service: true,
        payments: {
          where: { reversed_at: null, estorno_of_id: null },
          orderBy: { created_at: "desc" },
        },
        compensacao: { select: { amount: true, status: true, reversed_at: true } },
      },
    }),
    prisma.financeEntry.findMany({
      where: {
        due_date: { lte: nextDueLimit },
        status: { in: ["programado", "pendente", "vencido"] },
      },
      orderBy: { due_date: "asc" },
      take: 6,
      include: {
        reservation: { include: { client: true } },
        compensacao: { select: { amount: true, status: true, reversed_at: true } },
        payments: {
          where: { reversed_at: null, estorno_of_id: null },
          select: { amount: true },
        },
      },
    }),
    view === "faturas" ? prisma.billingCycle.findMany({
      orderBy: [{ period: "desc" }, { created_at: "desc" }],
      take: 40,
      include: {
        company: true,
        _count: { select: { reservations: true } },
      },
    }) : Promise.resolve([]),
    prisma.bankAccount.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
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

  const totals = summaryGroups.reduce(
    (result, entry) => {
      const amount = Number(entry.amount ?? 0);
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
      return result;
    },
    { revenue: 0, expense: 0, receivable: 0, payable: 0, overdue: 0 },
  );
  totals.overdue = overdueSummary.reduce((sum, entry) => sum + Number(entry.amount ?? 0), 0);

  const chartData = groupCashflow(chartEntries, days);
  const periodResult = chartData.reduce((sum, entry) => sum + entry.resultado, 0);

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
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
        <Link href="/admin/financeiro/compensacoes" className={secondaryButtonClass}>Compensar fornecedor</Link>
        <form className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:w-auto" action="/admin/financeiro" method="get">
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
        </div>
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
          value={money.format(periodResult)}
          accent={periodResult >= 0 ? "gold" : "warning"}
          trend={{ direction: periodResult >= 0 ? "up" : "down", label: "lançamentos dos últimos " + days + " dias", tone: periodResult >= 0 ? "positive" : "negative" }}
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
            <>
              <ul className="grid gap-3 p-4 md:hidden">
                {billingCycles.map((cycle) => (
                  <li key={cycle.id}>
                    <article className="rounded-xl border border-forest/10 bg-[#faf9f6] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-ink">{cycle.company.name}</p>
                          <p className="mt-1 text-xs text-forest/48">Período {cycle.period}</p>
                        </div>
                        <Badge tone={invoiceTone(cycle.status)}>{invoiceStatusLabel(cycle.status)}</Badge>
                      </div>
                      <dl className="mt-4 grid grid-cols-3 gap-3 text-xs">
                        <div><dt className="text-forest/43">Total</dt><dd className="mt-1 font-semibold text-forest">{money.format(Number(cycle.total_amount))}</dd></div>
                        <div><dt className="text-forest/43">Pago</dt><dd className="mt-1 font-semibold text-forest">{money.format(Number(cycle.paid_amount))}</dd></div>
                        <div><dt className="text-forest/43">Reservas</dt><dd className="mt-1 font-semibold text-forest">{cycle._count.reservations}</dd></div>
                      </dl>
                      <a
                        href={`/api/documentos/fatura/${cycle.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="focus-ring mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-forest/15 bg-white text-sm font-semibold text-forest active:bg-forest/5"
                      >
                        Gerar PDF
                        <ArrowRight size={14} aria-hidden="true" />
                      </a>
                    </article>
                  </li>
                ))}
              </ul>

              <div className="hidden overflow-x-auto md:block">
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
                      <td className="px-4 py-3.5 text-forest/64">{cycle._count.reservations}</td>
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
            </>
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
                        {money.format(Math.max(0, Number(entry.amount) - activeCompensationAmount(entry) - activePaymentAmount(entry)))}
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
              <p className="mt-1 text-xs text-forest/46">Últimos 50 registros conforme os filtros.</p>
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
              <>
              <div className="divide-y divide-forest/10 md:hidden">
                {entries.map((entry) => {
                  const paid = entry.payments.reduce((sum, payment) => sum + Number(payment.amount), 0) + activeCompensationAmount(entry);
                  const remaining = Math.max(0, Number(entry.amount) - paid);
                  const isOverdue = entry.status !== "pago" && entry.due_date && entry.due_date < now;
                  return <article key={entry.id} className="space-y-4 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{entry.description ?? FINANCE_ENTRY_CATEGORY_LABEL[entry.category] ?? entry.category}</p><p className="mt-1 text-xs text-forest/52">{entry.reservation?.code ?? "Sem reserva"} · {partyName(entry)}</p></div>
                      <Badge tone={isOverdue ? "danger" : statusTone(entry.status)}>{isOverdue ? "Vencido" : FINANCE_ENTRY_STATUS_LABEL[entry.status]}</Badge>
                    </div>
                    <div className="flex items-end justify-between gap-3"><div><span className="block text-xs text-forest/48">{entry.type === "receita" ? "A receber" : "A pagar"}</span><strong className={`mt-1 block text-lg ${entry.type === "receita" ? "text-success" : "text-danger"}`}>{money.format(Number(entry.amount))}</strong>{paid > 0 && remaining > 0 && <span className="mt-1 block text-xs text-forest/55">Pago {money.format(paid)} · saldo {money.format(remaining)}</span>}</div><span className="text-xs text-forest/48">{entry.due_date ? `Vence ${entry.due_date.toLocaleDateString("pt-BR", { timeZone: "UTC" })}` : entry.created_at.toLocaleDateString("pt-BR", { timeZone: "America/Bahia" })}</span></div>
                    {entry.payment_eligible && entry.status !== "pago" && <RegisterPaymentForm entryId={entry.id} remainingAmount={remaining.toFixed(2)} bankAccounts={bankAccounts} onRegister={registerPayment} />}
                    {entry.status === "pago" && entry.payments[0] && <a href={`/api/documentos/recibo/${entry.payments[0].id}`} target="_blank" rel="noreferrer" className={secondaryButtonClass}>Abrir recibo</a>}
                  </article>;
                })}
              </div>
              <div className="hidden overflow-x-auto md:block">
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
                          {activeCompensationAmount(entry) > 0 && (
                            <span className="mt-1 block text-[10px] font-normal text-forest/42">
                              Saldo {money.format(Math.max(0, Number(entry.amount) - entry.payments.reduce((sum, payment) => sum + Number(payment.amount), 0) - activeCompensationAmount(entry)))}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge tone={statusTone(entry.status)}>
                            {FINANCE_ENTRY_STATUS_LABEL[entry.status]}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          {entry.payment_eligible && entry.status !== "pago" && (() => {
                            const paid = entry.payments.reduce((sum, payment) => sum + Number(payment.amount), 0) + activeCompensationAmount(entry);
                            const remaining = Math.max(0, Number(entry.amount) - paid);
                            return <RegisterPaymentForm entryId={entry.id} remainingAmount={remaining.toFixed(2)} bankAccounts={bankAccounts} onRegister={registerPayment} />;
                          })()}
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
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
