import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CalendarRange,
  CarFront,
  CheckCircle2,
  Clock3,
  Inbox,
  MapPin,
  Plus,
  Route,
  UserRoundCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/ui/metric-card";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { SERVICE_TYPE_LABEL } from "@/lib/reservations/service-type-labels";

function bahiaDayRange() {
  const now = new Date();
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bahia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const start = new Date(`${date}T00:00:00-03:00`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  const weekEnd = new Date(start);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 8);
  return { now, start, end, weekEnd };
}
const EXECUTION_LABEL: Record<string, string> = {
  agendado: "Agendado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

function executionTone(status: string): "success" | "info" | "neutral" | "danger" {
  if (status === "concluido") return "success";
  if (status === "em_andamento") return "info";
  if (status === "cancelado") return "danger";
  return "neutral";
}

export default async function AdminHomePage() {
  const user = await getCurrentUser();
  const { now, start, end, weekEnd } = bahiaDayRange();

  const [
    todayCount,
    todayServices,
    inProgress,
    pendingAcceptances,
    openAlerts,
    openRequests,
    pendingExpenses,
    unassignedServices,
    upcomingServices,
    activeDrivers,
    activeVehicles,
  ] = await Promise.all([
    prisma.service.count({
      where: { scheduled_date: { gte: start, lt: end }, execution_status: { not: "cancelado" } },
    }),
    prisma.service.findMany({
      where: { scheduled_date: { gte: start, lt: end }, execution_status: { not: "cancelado" } },
      orderBy: [{ scheduled_time: "asc" }, { created_at: "asc" }],
      take: 12,
      include: {
        reservation: { include: { client: true } },
        driver: true,
        vehicle: true,
      },
    }),
    prisma.service.count({ where: { execution_status: "em_andamento" } }),
    prisma.service.count({
      where: { execution_type: "fornecedor", acceptance_status: "aguardando_aceite", execution_status: "agendado" },
    }),
    prisma.alert.count({ where: { archived: false } }),
    prisma.changeRequest.count({ where: { status: { in: ["solicitada", "em_analise"] } } }),
    prisma.serviceExpense.count({ where: { status: "pendente" } }),
    prisma.service.count({
      where: {
        execution_status: "agendado",
        scheduled_date: { gte: start, lt: weekEnd },
        OR: [{ driver_id: null }, { vehicle_id: null }],
      },
    }),
    prisma.service.findMany({
      where: {
        scheduled_date: { gte: end, lt: weekEnd },
        execution_status: { in: ["agendado", "em_andamento"] },
      },
      orderBy: [{ scheduled_date: "asc" }, { scheduled_time: "asc" }],
      take: 7,
      include: { reservation: { include: { client: true } }, driver: true },
    }),
    prisma.driver.count({ where: { status: "ativo", approval_status: "aprovado" } }),
    prisma.vehicle.count({ where: { status: "ativo", approval_status: "aprovado" } }),
  ]);

  const attentionItems = [
    {
      label: "Confirmar serviços",
      description: `${pendingAcceptances} aguardando aceite de fornecedor`,
      count: pendingAcceptances,
      href: "/admin/reservas",
      icon: CheckCircle2,
    },
    {
      label: "Alocar recursos",
      description: `${unassignedServices} sem motorista ou veículo`,
      count: unassignedServices,
      href: "/admin/reservas",
      icon: UserRoundCheck,
    },
    {
      label: "Revisar solicitações",
      description: `${openRequests} pedidos em análise`,
      count: openRequests,
      href: "/admin/solicitacoes",
      icon: Inbox,
    },
    {
      label: "Aprovar despesas",
      description: `${pendingExpenses} lançamentos pendentes`,
      count: pendingExpenses,
      href: "/admin/despesas",
      icon: CalendarDays,
    },
  ].filter((item) => item.count > 0);

  const firstName =
    user?.display_name?.split(" ")[0] ??
    user?.native_name?.split(" ")[0] ??
    "equipe";

  return (
    <div className="mx-auto max-w-[1480px] space-y-6">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="eyebrow">Painel operacional</p>
          <h1 className="page-heading mt-1">Visão geral</h1>
          <p className="page-description">
            Olá, {firstName}. Acompanhe a operação e resolva o que precisa de atenção.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-forest/10 bg-white px-3 text-xs text-forest/56">
            <CalendarDays size={15} aria-hidden="true" />
            {new Intl.DateTimeFormat("pt-BR", {
              timeZone: "America/Bahia",
              weekday: "long",
              day: "2-digit",
              month: "long",
            }).format(now)}
          </span>
          <Link
            href="/admin/reservas/novo"
            className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg bg-forest px-4 text-sm font-medium text-cream transition hover:bg-forest-light"
          >
            <Plus size={16} aria-hidden="true" />
            Nova reserva
          </Link>
        </div>
      </header>

      <section aria-label="Resumo operacional" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Route}
          label="Serviços hoje"
          value={String(todayCount)}
          accent="forest"
          trend={{ direction: todayCount > 0 ? "up" : "flat", label: "agenda operacional", tone: "neutral" }}
        />
        <MetricCard
          icon={Clock3}
          label="Em andamento"
          value={String(inProgress)}
          accent="info"
          trend={{ direction: inProgress > 0 ? "up" : "flat", label: inProgress > 0 ? "acompanhar execução" : "nenhum agora", tone: "neutral" }}
        />
        <MetricCard
          icon={CheckCircle2}
          label="Confirmações pendentes"
          value={String(pendingAcceptances)}
          accent={pendingAcceptances > 0 ? "warning" : "success"}
          trend={{ direction: pendingAcceptances > 0 ? "up" : "flat", label: pendingAcceptances > 0 ? "requer resposta" : "tudo confirmado", tone: pendingAcceptances > 0 ? "negative" : "positive" }}
        />
        <MetricCard
          icon={AlertTriangle}
          label="Alertas operacionais"
          value={String(openAlerts)}
          accent={openAlerts > 0 ? "danger" : "success"}
          trend={{ direction: openAlerts > 0 ? "up" : "flat", label: openAlerts > 0 ? "verificar agora" : "nenhuma ocorrência", tone: openAlerts > 0 ? "negative" : "positive" }}
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(290px,0.65fr)]">
        <section className="surface-panel min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-forest/10 px-5 py-4">
            <div>
              <h2 className="section-heading">Operação de hoje</h2>
              <p className="mt-1 text-xs text-forest/46">Serviços ordenados por horário.</p>
            </div>
            <Link
              href="/admin/reservas"
              className="focus-ring inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-forest hover:bg-forest/5"
            >
              Ver agenda
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>

          {todayServices.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <CalendarDays className="mx-auto text-forest/22" size={30} aria-hidden="true" />
              <p className="mt-3 text-sm font-medium text-forest">Agenda livre hoje</p>
              <p className="mt-1 text-xs text-forest/46">Nenhum serviço está programado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr>
                    <th className="bg-[#faf9f6] px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Horário</th>
                    <th className="bg-[#faf9f6] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Reserva</th>
                    <th className="bg-[#faf9f6] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Passageiro e rota</th>
                    <th className="bg-[#faf9f6] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Recurso</th>
                    <th className="bg-[#faf9f6] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Status</th>
                    <th className="bg-[#faf9f6] px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {todayServices.map((service) => (
                    <tr key={service.id} className="group border-t border-forest/[0.075] transition hover:bg-forest/[0.022]">
                      <td className="px-5 py-3.5 font-semibold text-forest">{service.scheduled_time ?? "—"}</td>
                      <td className="px-4 py-3.5 text-xs font-medium text-forest/66">{service.reservation.code}</td>
                      <td className="max-w-[340px] px-4 py-3.5">
                        <p className="truncate font-medium text-ink">{service.reservation.client.name}</p>
                        <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-forest/45">
                          <MapPin size={11} aria-hidden="true" />
                          {service.pickup_location ?? "Origem não informada"}
                          <ArrowRight size={10} aria-hidden="true" />
                          {service.dropoff_location ?? "Destino não informado"}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-xs text-ink/76">{service.driver?.name ?? "Motorista a definir"}</p>
                        <p className="mt-1 text-[11px] text-forest/43">{service.vehicle ? `${service.vehicle.model} · ${service.vehicle.plate}` : "Veículo a definir"}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge tone={executionTone(service.execution_status)}>
                          {EXECUTION_LABEL[service.execution_status] ?? service.execution_status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={`/admin/reservas/${service.reservation_id}/servicos/${service.id}`}
                          aria-label={`Abrir serviço ${service.reservation.code}`}
                          className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-lg text-forest/35 transition hover:bg-forest/5 hover:text-forest"
                        >
                          <ArrowRight size={15} aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="surface-panel overflow-hidden">
          <div className="border-b border-forest/10 px-5 py-4">
            <h2 className="section-heading">Ações necessárias</h2>
            <p className="mt-1 text-xs text-forest/46">Prioridades para manter o dia fluindo.</p>
          </div>
          {attentionItems.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <CheckCircle2 className="mx-auto text-success/55" size={29} aria-hidden="true" />
              <p className="mt-3 text-sm font-medium text-forest">Operação em dia</p>
              <p className="mt-1 text-xs text-forest/46">Nenhuma pendência crítica agora.</p>
            </div>
          ) : (
            <ul className="divide-y divide-forest/[0.075]">
              {attentionItems.map(({ label, description, href, icon: Icon, count }) => (
                <li key={label}>
                  <Link href={href} className="group flex gap-3 px-5 py-4 transition hover:bg-forest/[0.025]">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning-light text-warning">
                      <Icon size={15} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <strong className="text-xs font-semibold text-forest">{label}</strong>
                        <span className="rounded-full bg-warning-light px-2 py-0.5 text-[10px] font-semibold text-warning">{count}</span>
                      </span>
                      <span className="mt-1 block text-[11px] leading-4 text-forest/48">{description}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(260px,0.55fr)]">
        <section className="surface-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-forest/10 px-5 py-4">
            <div>
              <h2 className="section-heading">Próximos 7 dias</h2>
              <p className="mt-1 text-xs text-forest/46">Antecipe alocações e confirmações.</p>
            </div>
            <CalendarRange size={18} className="text-gold" aria-hidden="true" />
          </div>
          {upcomingServices.length === 0 ? (
            <p className="px-5 py-9 text-center text-sm text-forest/48">Nenhum serviço futuro programado.</p>
          ) : (
            <ul className="grid divide-y divide-forest/[0.075] md:grid-cols-2 md:divide-x md:divide-y-0">
              {upcomingServices.slice(0, 6).map((service) => (
                <li key={service.id} className="min-w-0 px-5 py-3.5 md:[&:nth-child(n+3)]:border-t md:[&:nth-child(odd)]:border-l-0">
                  <div className="flex items-start gap-3">
                    <span className="min-w-12 rounded-lg bg-forest/[0.055] px-2 py-1.5 text-center">
                      <span className="block text-[10px] uppercase text-forest/44">
                        {service.scheduled_date?.toLocaleDateString("pt-BR", { timeZone: "UTC", weekday: "short" })}
                      </span>
                      <strong className="block text-sm text-forest">
                        {service.scheduled_date?.toLocaleDateString("pt-BR", { timeZone: "UTC", day: "2-digit" })}
                      </strong>
                    </span>
                    <span className="min-w-0">
                      <strong className="block truncate text-xs text-ink">{service.reservation.client.name}</strong>
                      <span className="mt-1 block truncate text-[11px] text-forest/48">
                        {service.scheduled_time ?? "—"} · {SERVICE_TYPE_LABEL[service.type] ?? service.type}
                      </span>
                      <span className="mt-1 block truncate text-[11px] text-forest/42">{service.driver?.name ?? "Motorista a definir"}</span>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface-panel p-5">
          <h2 className="section-heading">Capacidade disponível</h2>
          <p className="mt-1 text-xs text-forest/46">Recursos aprovados e ativos.</p>
          <dl className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-forest/10 bg-[#faf9f6] p-3">
              <dt className="flex items-center gap-2 text-[11px] text-forest/48">
                <UserRoundCheck size={14} aria-hidden="true" />
                Motoristas
              </dt>
              <dd className="mt-2 text-2xl font-semibold text-forest">{activeDrivers}</dd>
            </div>
            <div className="rounded-lg border border-forest/10 bg-[#faf9f6] p-3">
              <dt className="flex items-center gap-2 text-[11px] text-forest/48">
                <CarFront size={14} aria-hidden="true" />
                Veículos
              </dt>
              <dd className="mt-2 text-2xl font-semibold text-forest">{activeVehicles}</dd>
            </div>
          </dl>
          <Link
            href="/admin/motoristas"
            className="focus-ring mt-4 inline-flex items-center gap-1 rounded text-xs font-semibold text-forest hover:text-forest-light"
          >
            Gerenciar recursos
            <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </section>
      </div>
    </div>
  );
}
