import Link from "next/link";
import { Download, FileBarChart } from "lucide-react";
import { MetricCard } from "@/components/ui/metric-card";
import { requireFinancialUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { inputClass, labelClass, secondaryButtonClass } from "@/lib/ui";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const date = (value: string | undefined, fallback: Date) => {
  const parsed = value ? new Date(`${value}T00:00:00.000Z`) : fallback;
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
};

type ReportParams = {
  empresa?: string;
  de?: string;
  ate?: string;
  status?: string;
};

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<ReportParams>;
}) {
  await requireFinancialUser();
  const params = await searchParams;
  const today = new Date();
  const defaultFrom = new Date(today);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 30);
  defaultFrom.setUTCHours(0, 0, 0, 0);
  const from = date(params.de, defaultFrom);
  const to = date(params.ate, today);
  to.setUTCHours(23, 59, 59, 999);

  const [companies, selectedCompany] = await Promise.all([
    prisma.company.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    params.empresa
      ? prisma.company.findUnique({
          where: { id: params.empresa },
          select: {
            id: true,
            name: true,
            document: true,
            roles: true,
            commission_enabled: true,
            commission: true,
            billing_limit: true,
          },
        })
      : null,
  ]);

  const reservations = await prisma.reservation.findMany({
    where: {
      created_at: { gte: from, lte: to },
      ...(params.status ? { status: params.status as never } : {}),
      ...(selectedCompany
        ? {
            OR: [
              { origin_partner_id: selectedCompany.id },
              { services: { some: { supplier_id: selectedCompany.id } } },
            ],
          }
        : {}),
    },
    include: {
      client: { select: { name: true } },
      origin_partner: { select: { name: true } },
      services: {
        include: {
          supplier: { select: { name: true } },
          driver: { select: { name: true } },
          vehicle: { select: { plate: true, model: true } },
          service_expenses: {
            where: { status: { not: "rejeitado" } },
            select: { amount: true },
          },
        },
      },
    },
    orderBy: { created_at: "desc" },
    take: 500,
  });

  const relevantParty = selectedCompany
    ? {
        party_type: { in: ["fornecedor", "parceiro"] as never[] },
        party_id: selectedCompany.id,
      }
    : undefined;
  const entries = await prisma.financeEntry.findMany({
    where: {
      created_at: { gte: from, lte: to },
      ...(relevantParty ?? {}),
    },
    include: {
      payments: {
        where: { reversed_at: null, estorno_of_id: null },
        select: { amount: true },
      },
      compensacao: {
        select: { amount: true, status: true, reversed_at: true },
      },
    },
  });

  const reportRows = reservations.flatMap((reservation) =>
    reservation.services
      .filter(
        (service) =>
          !selectedCompany ||
          service.supplier_id === selectedCompany.id ||
          reservation.origin_partner_id === selectedCompany.id,
      )
      .map((service) => {
        const expense = service.service_expenses.reduce(
          (total, item) => total + Number(item.amount),
          0,
        );
        const cost = expense + Number(service.supplier_cost ?? 0);

        return {
          reservation,
          service,
          cost,
          net: Math.max(0, Number(service.price) - cost),
        };
      }),
  );
  const gross = reportRows.reduce(
    (sum, row) => sum + Number(row.service.price),
    0,
  );
  const costs = reportRows.reduce((sum, row) => sum + row.cost, 0);
  const received = entries
    .filter((entry) => entry.type === "receita")
    .reduce(
      (sum, entry) =>
        sum +
        entry.payments.reduce(
          (total, payment) => total + Number(payment.amount),
          0,
        ),
      0,
    );
  const open = entries.reduce((sum, entry) => {
    const paid = entry.payments.reduce(
      (total, payment) => total + Number(payment.amount),
      0,
    );
    const compensated =
      entry.compensacao?.status === "confirmada" &&
      !entry.compensacao.reversed_at
        ? Number(entry.compensacao.amount)
        : 0;
    return sum + Math.max(0, Number(entry.amount) - paid - compensated);
  }, 0);

  return (
    <div className="mx-auto max-w-[1480px] space-y-6">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="eyebrow">Controladoria</p>
          <h1 className="page-heading mt-1">Relatórios gerenciais</h1>
          <p className="page-description">
            Visão auditável da operação, empresas, reservas, custos e
            recebimentos.
          </p>
        </div>
        <Link
          href="/api/admin/relatorios/export"
          className={`${secondaryButtonClass} w-full sm:w-auto`}
        >
          <Download size={15} /> Exportar CSV
        </Link>
      </header>

      <form
        className="surface-panel grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_160px_160px_180px_auto]"
        action="/admin/relatorios"
        method="get"
      >
        <label className="grid gap-1 md:col-span-2 xl:col-span-1">
          <span className={labelClass}>Empresa</span>
          <select
            name="empresa"
            defaultValue={params.empresa ?? ""}
            className={inputClass}
          >
            <option value="">Todas as empresas</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className={labelClass}>Data inicial</span>
          <input
            type="date"
            name="de"
            defaultValue={params.de}
            className={inputClass}
          />
        </label>
        <label className="grid gap-1">
          <span className={labelClass}>Data final</span>
          <input
            type="date"
            name="ate"
            defaultValue={params.ate}
            className={inputClass}
          />
        </label>
        <label className="grid gap-1">
          <span className={labelClass}>Status da reserva</span>
          <select
            name="status"
            defaultValue={params.status ?? ""}
            className={inputClass}
          >
            <option value="">Todos os status</option>
            <option value="confirmado">Confirmadas</option>
            <option value="concluido">Concluídas</option>
            <option value="cancelado">Canceladas</option>
          </select>
        </label>
        <button className={`${secondaryButtonClass} self-end`}>
          Aplicar filtros
        </button>
      </form>

      {selectedCompany && (
        <section className="surface-panel border-l-4 border-gold p-5">
          <p className="eyebrow">Dossiê da empresa</p>
          <h2 className="mt-1 text-xl font-semibold text-forest">
            {selectedCompany.name}
          </h2>
          <p className="mt-1 text-xs text-forest/55">
            {selectedCompany.document ?? "Documento não informado"} ·{" "}
            {selectedCompany.roles.join(" + ")}
          </p>
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <MetricCard icon={FileBarChart} label="Reservas" value={String(reservations.length)} accent="forest" />
        <MetricCard icon={FileBarChart} label="Serviços" value={String(reportRows.length)} accent="gold" />
        <MetricCard icon={FileBarChart} label="Valor bruto" value={money.format(gross)} accent="success" />
        <MetricCard icon={FileBarChart} label="Custos" value={money.format(costs)} accent="warning" />
        <MetricCard icon={FileBarChart} label="Recebido" value={money.format(received)} accent="success" />
        <MetricCard icon={FileBarChart} label="Saldo em aberto" value={money.format(open)} accent="danger" />
      </section>

      <section className="surface-panel overflow-hidden">
        <div className="border-b border-forest/10 px-4 py-4 sm:px-5">
          <h2 className="section-heading">Detalhamento por serviço</h2>
          <p className="mt-1 text-xs text-forest/58">
            {reportRows.length} serviços no período selecionado. Valores
            calculados a partir dos registros financeiros e operacionais.
          </p>
        </div>
        {reportRows.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-forest/58">
            Nenhum registro encontrado.
          </p>
        ) : (
          <>
            <ul className="divide-y divide-forest/[0.075] xl:hidden">
              {reportRows.map(({ reservation, service, cost, net }) => (
                <li key={service.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/reservas/${reservation.id}`}
                        className="focus-ring rounded text-sm font-semibold text-forest underline decoration-gold/70 underline-offset-4"
                      >
                        {reservation.code}
                      </Link>
                      <p className="mt-1 truncate text-sm font-medium text-ink">
                        {reservation.client.name}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-forest/62">
                      {service.scheduled_date?.toLocaleDateString("pt-BR", {
                        timeZone: "UTC",
                      }) ?? "Sem data"}
                    </span>
                  </div>

                  <dl className="mt-4 grid gap-2 rounded-lg bg-[#faf9f6] p-3 text-xs sm:grid-cols-2">
                    <div className="min-w-0">
                      <dt className="text-forest/58">Empresa</dt>
                      <dd className="mt-1 truncate font-medium text-forest">
                        {service.supplier?.name ?? reservation.origin_partner?.name ?? "Nativos"}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-forest/58">Motorista</dt>
                      <dd className="mt-1 truncate font-medium text-forest">
                        {service.driver?.name ?? "A definir"}
                      </dd>
                    </div>
                    <div className="min-w-0 sm:col-span-2">
                      <dt className="text-forest/58">Veículo</dt>
                      <dd className="mt-1 truncate font-medium text-forest">
                        {service.vehicle
                          ? `${service.vehicle.plate} · ${service.vehicle.model}`
                          : "Não informado"}
                      </dd>
                    </div>
                  </dl>

                  <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-xs text-forest/58">Bruto</dt>
                      <dd className="mt-1 font-semibold text-forest">
                        {money.format(Number(service.price))}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-forest/58">Custos</dt>
                      <dd className="mt-1 font-semibold text-danger">
                        {money.format(cost)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-forest/58">Líquido</dt>
                      <dd className="mt-1 font-semibold text-success">
                        {money.format(net)}
                      </dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto scrollbar-clean xl:block">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr>
                    {["Reserva", "Data", "Cliente", "Empresa", "Motorista", "Veículo", "Bruto", "Custos", "Líquido"].map((label) => (
                      <th
                        key={label}
                        className="bg-[#faf9f6] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-forest/55"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportRows.map(({ reservation, service, cost, net }) => (
                    <tr key={service.id} className="border-t border-forest/[0.075]">
                      <td className="px-4 py-3.5">
                        <Link href={`/admin/reservas/${reservation.id}`} className="font-semibold text-forest underline">
                          {reservation.code}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-forest/60">
                        {service.scheduled_date?.toLocaleDateString("pt-BR", { timeZone: "UTC" }) ?? "—"}
                      </td>
                      <td className="px-4 py-3.5 text-xs">{reservation.client.name}</td>
                      <td className="px-4 py-3.5 text-xs">
                        {service.supplier?.name ?? reservation.origin_partner?.name ?? "Nativos"}
                      </td>
                      <td className="px-4 py-3.5 text-xs">{service.driver?.name ?? "A definir"}</td>
                      <td className="px-4 py-3.5 text-xs">
                        {service.vehicle ? `${service.vehicle.plate} · ${service.vehicle.model}` : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-semibold">{money.format(Number(service.price))}</td>
                      <td className="px-4 py-3.5 text-xs text-danger">{money.format(cost)}</td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-success">{money.format(net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <p className="text-xs text-forest/58">
        Relatório gerado em{" "}
        {new Date().toLocaleString("pt-BR", { timeZone: "America/Bahia" })}.
        A exportação respeita os mesmos filtros e permissões desta tela.
      </p>
    </div>
  );
}
