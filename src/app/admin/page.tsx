import Link from "next/link";
import { Prisma } from "@prisma/client";
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

type DashboardCounters = {
  today_count: number;
  in_progress: number;
  pending_acceptances: number;
  open_alerts: number;
  open_requests: number;
  pending_expenses: number;
  unassigned_services: number;
  active_drivers: number;
  active_vehicles: number;
};

export default async function AdminHomePage() {
  const user = await getCurrentUser();
  const { now, start, end, weekEnd } = bahiaDayRange();

  const [counterRows, todayServices, upcomingServices] = await Promise.all([
    prisma.$queryRaw<DashboardCounters[]>(Prisma.sql`
      SELECT
        (SELECT COUNT(*)::integer FROM "public"."services"
          WHERE "scheduled_date" >= ${start} AND "scheduled_date" < ${end}
            AND "execution_status" <> 'cancelado') AS "today_count",
        (SELECT COUNT(*)::integer FROM "public"."services"
          WHERE "execution_status" = 'em_andamento') AS "in_progress",
        (SELECT COUNT(*)::integer FROM "public"."services"
          WHERE "execution_type" = 'fornecedor'
            AND "acceptance_status" = 'aguardando_aceite'
            AND "execution_status" = 'agendado') AS "pending_acceptances",
        (SELECT COUNT(*)::integer FROM "public"."alerts"
          WHERE "archived" = false) AS "open_alerts",
        (SELECT COUNT(*)::integer FROM "public"."change_requests"
          WHERE "status" IN ('solicitada', 'em_analise')) AS "open_requests",
        (SELECT COUNT(*)::integer FROM "public"."service_expenses"
          WHERE "status" = 'pendente') AS "pending_expenses",
        (SELECT COUNT(*)::integer FROM "public"."services"
          WHERE "execution_status" = 'agendado'
            AND "scheduled_date" >= ${start} AND "scheduled_date" < ${weekEnd}
            AND ("driver_id" IS NULL OR "vehicle_id" IS NULL)) AS "unassigned_services",
        (SELECT COUNT(*)::integer FROM "public"."drivers"
          WHERE "status" = 'ativo' AND "approval_status" = 'aprovado') AS "active_drivers",
        (SELECT COUNT(*)::integer FROM "public"."vehicles"
          WHERE "status" = 'ativo' AND "approval_status" = 'aprovado') AS "active_vehicles"
    `),
    prisma.service.findMany({
      where: { scheduled_date: { gte: start, lt: end }, execution_status: { not: "cancelado" } },
      orderBy: [{ scheduled_time: "asc" }, { created_at: "asc" }],
      take: 12,
      select: {
        id: true,
        reservation_id: true,
        scheduled_time: true,
        execution_status: true,
        pickup_location: true,
        dropoff_location: true,
        reservation: { select: { code: true, client: { select: { name: true } } } },
        driver: { select: { name: true } },
        vehicle: { select: { model: true, plate: true } },
      },
    }),
    prisma.service.findMany({
      where: {
        scheduled_date: { gte: end, lt: weekEnd },
        execution_status: { in: ["agendado", "em_andamento"] },
      },
      orderBy: [{ scheduled_date: "asc" }, { scheduled_time: "asc" }],
      take: 7,
      select: {
        id: true,
        scheduled_date: true,
        scheduled_time: true,
        type: true,
        reservation: { select: { code: true, client: { select: { name: true } } } },
        driver: { select: { name: true } },
      },
    }),
  ]);

  const counters = counterRows[0] ?? {
    today_count: 0,
    in_progress: 0,
    pending_acceptances: 0,
    open_alerts: 0,
    open_requests: 0,
    pending_expenses: 0,
    unassigned_services: 0,
    active_drivers: 0,
    active_vehicles: 0,
  };
  const {
    today_count: todayCount,
    in_progress: inProgress,
    pending_acceptances: pendingAcceptances,
    open_alerts: openAlerts,
    open_requests: openRequests,
    pending_expenses: pendingExpenses,
    unassigned_services: unassignedServices,
    active_drivers: activeDrivers,
    active_vehicles: activeVehicles,
  } = counters;

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
              <p className="mt-1 text-xs text-forest/58">Serviços ordenados por horário.</p>
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
              <p className="mt-1 text-xs text-forest/58">Nenhum serviço está programado.</p>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-forest/[0.075] xl:hidden">
                {todayServices.map((service) => (
                  <li key={service.id}>
                    <Link
                      href={`/admin/reservas/${service.reservation_id}/servicos/${service.id}`}
                      className="focus-ring block px-4 py-4 transition active:bg-forest/[0.04]"
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            <strong className="text-base font-semibold text-forest">
                              {service.scheduled_time ?? "—"}
                            </strong>
                            <span className="text-[11px] font-medium text-forest/60">
                              {service.reservation.code}
                            </span>
                          </span>
                          <span className="mt-1 block truncate text-sm font-medium text-ink">
                            {service.reservation.client.name}
                          </span>
                        </span>
                        <Badge tone={executionTone(service.execution_status)}>
                          {EXECUTION_LABEL[service.execution_status] ?? service.execution_status}
                        </Badge>
                      </span>

                      <span className="mt-3 grid gap-2 rounded-lg bg-forest/[0.035] p-3 text-xs text-forest/58">
                        <span className="flex min-w-0 items-start gap-2">
                          <MapPin className="mt-0.5 shrink-0" size={13} aria-hidden="true" />
                          <span className="min-w-0">
                            <span className="block truncate">
                              {service.pickup_location ?? "Origem não informada"}
                            </span>
                            <span className="mt-0.5 block truncate text-forest/55">
                              até {service.dropoff_location ?? "destino não informado"}
                            </span>
                          </span>
                        </span>
                        <span className="flex min-w-0 items-center gap-2">
                          <CarFront className="shrink-0" size={13} aria-hidden="true" />
                          <span className="truncate">
                            {service.driver?.name ?? "Motorista a definir"}
                            {service.vehicle
                              ? ` · ${service.vehicle.model} · ${service.vehicle.plate}`
                              : " · Veículo a definir"}
                          </span>
                        </span>
                      </span>
                      <span className="mt-3 flex items-center justify-end gap-1 text-xs font-semibold text-forest">
                        Abrir serviço
                        <ArrowRight size={14} aria-hidden="true" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="hidden overflow-x-auto xl:block">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr>
                    <th className="bg-[#faf9f6] px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-forest/55">Horário</th>
                    <th className="bg-[#faf9f6] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-forest/55">Reserva</th>
                    <th className="bg-[#faf9f6] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-forest/55">Passageiro e rota</th>
                    <th className="bg-[#faf9f6] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-forest/55">Recurso</th>
                    <th className="bg-[#faf9f6] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-forest/55">Status</th>
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
                        <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-forest/58">
                          <MapPin size={11} aria-hidden="true" />
                          {service.pickup_location ?? "Origem não informada"}
                          <ArrowRight size={10} aria-hidden="true" />
                          {service.dropoff_location ?? "Destino não informado"}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-xs text-ink/76">{service.driver?.name ?? "Motorista a definir"}</p>
                        <p className="mt-1 text-[11px] text-forest/55">{service.vehicle ? `${service.vehicle.model} · ${service.vehicle.plate}` : "Veículo a definir"}</p>
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
            </>
          )}
        </section>

        <aside className="surface-elevated overflow-hidden">
          <div className="border-b border-forest/10 px-5 py-4">
            <h2 className="section-heading">Ações necessárias</h2>
            <p className="mt-1 text-xs text-forest/58">Prioridades para manter o dia fluindo.</p>
          </div>
          {attentionItems.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <CheckCircle2 className="mx-auto text-success/55" size={29} aria-hidden="true" />
              <p className="mt-3 text-sm font-medium text-forest">Operação em dia</p>
              <p className="mt-1 text-xs text-forest/58">Nenhuma pendência crítica agora.</p>
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
                        <span className="rounded-full bg-warning-light px-2 py-0.5 text-[11px] font-semibold text-warning">{count}</span>
                      </span>
                      <span className="mt-1 block text-[11px] leading-4 text-forest/60">{description}</span>
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
              <p className="mt-1 text-xs text-forest/58">Antecipe alocações e confirmações.</p>
            </div>
            <CalendarRange size={18} className="text-gold" aria-hidden="true" />
          </div>
          {upcomingServices.length === 0 ? (
            <p className="px-5 py-9 text-center text-sm text-forest/60">Nenhum serviço futuro programado.</p>
          ) : (
            <ul className="grid divide-y divide-forest/[0.075] md:grid-cols-2 md:divide-x md:divide-y-0">
              {upcomingServices.slice(0, 6).map((service) => (
                <li key={service.id} className="min-w-0 px-5 py-3.5 md:[&:nth-child(n+3)]:border-t md:[&:nth-child(odd)]:border-l-0">
                  <div className="flex items-start gap-3">
                    <span className="min-w-12 rounded-lg bg-forest/[0.055] px-2 py-1.5 text-center">
                      <span className="block text-[11px] uppercase text-forest/55">
                        {service.scheduled_date?.toLocaleDateString("pt-BR", { timeZone: "UTC", weekday: "short" })}
                      </span>
                      <strong className="block text-sm text-forest">
                        {service.scheduled_date?.toLocaleDateString("pt-BR", { timeZone: "UTC", day: "2-digit" })}
                      </strong>
                    </span>
                    <span className="min-w-0">
                      <strong className="block truncate text-xs text-ink">{service.reservation.client.name}</strong>
                      <span className="mt-1 block truncate text-[11px] text-forest/60">
                        {service.scheduled_time ?? "—"} · {SERVICE_TYPE_LABEL[service.type] ?? service.type}
                      </span>
                      <span className="mt-1 block truncate text-[11px] text-forest/55">{service.driver?.name ?? "Motorista a definir"}</span>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface-panel p-5">
          <h2 className="section-heading">Capacidade disponível</h2>
          <p className="mt-1 text-xs text-forest/58">Recursos aprovados e ativos.</p>
          <dl className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-forest/10 bg-[#faf9f6] p-3">
              <dt className="flex items-center gap-2 text-[11px] text-forest/60">
                <UserRoundCheck size={14} aria-hidden="true" />
                Motoristas
              </dt>
              <dd className="mt-2 text-2xl font-semibold text-forest">{activeDrivers}</dd>
            </div>
            <div className="rounded-lg border border-forest/10 bg-[#faf9f6] p-3">
              <dt className="flex items-center gap-2 text-[11px] text-forest/60">
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
