import Link from "next/link";
import type { Prisma } from "@prisma/client";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  CarFront,
  CheckCircle2,
  Inbox,
  Plus,
  Route,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/ui/metric-card";
import { requireCompanyPortalUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { RESERVATION_STATUS_LABEL } from "@/lib/reservations/status-labels";
import { SERVICE_TYPE_LABEL } from "@/lib/reservations/service-type-labels";

function reservationTone(status: string): "success" | "warning" | "info" | "danger" | "neutral" {
  if (status === "confirmado" || status === "concluido") return "success";
  if (status === "pendente" || status === "rascunho") return "warning";
  if (status === "em_andamento") return "info";
  if (status === "cancelado" || status === "rejeitado") return "danger";
  return "neutral";
}

export default async function PortalEmpresaHomePage() {
  const user = await requireCompanyPortalUser();
  const company = user.linked_company;
  const isSupplier = company.roles.includes("fornecedor");
  const isPartner = company.roles.includes("parceiro");
  const partnerReservationWhere = {
    OR: [
      { origin_partner_id: company.id },
      { referrer_type: "company", referrer_id: company.id },
    ],
  } satisfies Prisma.ReservationWhereInput;

  const [reservations, supplierServices, pendingAcceptance, activeServices, drivers, vehicles, requests] =
    await Promise.all([
      isPartner
        ? prisma.reservation.findMany({
            where: partnerReservationWhere,
            select: {
              id: true,
              code: true,
              status: true,
              origin_partner_id: true,
              client: { select: { name: true } },
              _count: { select: { services: true } },
            },
            orderBy: { created_at: "desc" },
            take: 6,
          })
        : Promise.resolve([]),
      isSupplier
        ? prisma.service.findMany({
            where: {
              supplier_id: company.id,
              execution_status: { in: ["agendado", "em_andamento"] },
            },
            select: {
              id: true,
              type: true,
              scheduled_date: true,
              scheduled_time: true,
              acceptance_status: true,
              reservation: { select: { code: true, client: { select: { name: true } } } },
              driver: { select: { name: true } },
            },
            orderBy: [{ scheduled_date: "asc" }, { scheduled_time: "asc" }],
            take: 6,
          })
        : Promise.resolve([]),
      isSupplier
        ? prisma.service.count({
            where: {
              supplier_id: company.id,
              acceptance_status: "aguardando_aceite",
              execution_status: "agendado",
            },
          })
        : Promise.resolve(0),
      isSupplier
        ? prisma.service.count({
            where: {
              supplier_id: company.id,
              acceptance_status: "aceito",
              execution_status: { in: ["agendado", "em_andamento"] },
            },
          })
        : Promise.resolve(0),
      isSupplier
        ? prisma.driver.count({ where: { supplier_id: company.id, status: "ativo" } })
        : Promise.resolve(0),
      isSupplier
        ? prisma.vehicle.count({ where: { supplier_id: company.id, status: "ativo" } })
        : Promise.resolve(0),
      prisma.changeRequest.count({
        where: {
          requester_type: "company",
          requester_id: company.id,
          status: { in: ["solicitada", "em_analise"] },
        },
      }),
    ]);

  const confirmedReservations = reservations.filter((reservation) =>
    ["confirmado", "em_andamento", "concluido"].includes(reservation.status),
  ).length;

  const firstName = (user.display_name ?? company.contact_name ?? company.name).split(" ")[0];
  const roleLabel =
    isPartner && isSupplier ? "Parceiro e fornecedor" : isSupplier ? "Fornecedor" : "Parceiro";

  const metrics = isSupplier
    ? [
        {
          icon: BadgeCheck,
          label: "Aguardando confirmação",
          value: String(pendingAcceptance),
          accent: pendingAcceptance > 0 ? ("warning" as const) : ("success" as const),
        },
        {
          icon: Route,
          label: "Serviços ativos",
          value: String(activeServices),
          accent: "info" as const,
        },
        {
          icon: Users,
          label: "Motoristas ativos",
          value: String(drivers),
          accent: "forest" as const,
        },
        {
          icon: CarFront,
          label: "Veículos ativos",
          value: String(vehicles),
          accent: "gold" as const,
        },
      ]
    : [
        {
          icon: CalendarDays,
          label: "Reservas recentes",
          value: String(reservations.length),
          accent: "forest" as const,
        },
        {
          icon: CheckCircle2,
          label: "Confirmadas",
          value: String(confirmedReservations),
          accent: "success" as const,
        },
        {
          icon: Inbox,
          label: "Solicitações abertas",
          value: String(requests),
          accent: requests > 0 ? ("warning" as const) : ("success" as const),
        },
        {
          icon: BriefcaseBusiness,
          label: "Serviços vinculados",
          value: String(reservations.reduce((total, reservation) => total + reservation._count.services, 0)),
          accent: "info" as const,
        },
      ];

  return (
    <div className="mx-auto max-w-[1420px] space-y-6">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="eyebrow">{roleLabel}</p>
          <h1 className="page-heading mt-1">Olá, {firstName}</h1>
          <p className="page-description">
            {isSupplier
              ? "Acompanhe confirmações, serviços e recursos da sua operação."
              : "Acompanhe suas reservas e solicitações com clareza."}
          </p>
        </div>
        <Link
          href={isPartner ? "/portal/empresa/reservas#nova-reserva" : "/portal/empresa/operacao"}
          className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-gold px-4 text-sm font-semibold text-forest-dark transition hover:bg-gold-light"
        >
          {isPartner ? <Plus size={16} aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}
          {isPartner ? "Nova solicitação" : "Abrir operação"}
        </Link>
      </header>

      <section aria-label="Resumo do portal" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.label}
            icon={metric.icon}
            label={metric.label}
            value={metric.value}
            accent={metric.accent}
          />
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(290px,0.55fr)]">
        <div className="grid min-w-0 gap-5">
          {isPartner && (
            <section className="surface-panel overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-forest/10 px-5 py-4">
                <div>
                  <h2 className="section-heading">Próximas reservas</h2>
                  <p className="mt-1 text-xs text-forest/58">Atualizações mais recentes da sua conta.</p>
                </div>
                <Link href="/portal/empresa/reservas" className="focus-ring inline-flex items-center gap-1 rounded text-xs font-semibold text-forest">
                  Ver todas
                  <ArrowRight size={13} aria-hidden="true" />
                </Link>
              </div>
              {reservations.length === 0 ? (
                <p className="px-5 py-12 text-center text-sm text-forest/58">Nenhuma reserva vinculada ainda.</p>
              ) : (
                <>
                  <ul className="divide-y divide-forest/[0.075] xl:hidden">
                    {reservations.map((reservation) => (
                      <li key={reservation.id} className="p-4">
                        <article className="rounded-xl border border-forest/10 bg-[#faf9f6] p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-forest">{reservation.code}</p>
                              <p className="mt-1 truncate text-sm font-medium text-ink">{reservation.client.name}</p>
                            </div>
                            <Badge tone={reservationTone(reservation.status)}>
                              {RESERVATION_STATUS_LABEL[reservation.status]}
                            </Badge>
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-forest/62">
                            <span>{reservation._count.services} serviço(s)</span>
                            {reservation.origin_partner_id === company.id ? <a
                              href={`/api/documentos/voucher/${reservation.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="focus-ring inline-flex min-h-11 items-center rounded-lg border border-forest/15 bg-white px-4 font-semibold text-forest"
                            >
                              Voucher
                            </a> : <span className="rounded-lg bg-forest/[0.045] px-3 py-2 font-medium text-forest/60">Indicação</span>}
                          </div>
                        </article>
                      </li>
                    ))}
                  </ul>

                  <div className="hidden overflow-x-auto scrollbar-clean xl:block">
                    <table className="w-full min-w-[650px] text-sm">
                    <thead>
                      <tr>
                        <th className="bg-[#faf9f6] px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-forest/55">Reserva</th>
                        <th className="bg-[#faf9f6] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-forest/55">Passageiro</th>
                        <th className="bg-[#faf9f6] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-forest/55">Serviços</th>
                        <th className="bg-[#faf9f6] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-forest/55">Status</th>
                        <th className="bg-[#faf9f6] px-5 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {reservations.map((reservation) => (
                        <tr key={reservation.id} className="border-t border-forest/[0.075] hover:bg-forest/[0.022]">
                          <td className="px-5 py-3.5 text-xs font-semibold text-forest">{reservation.code}</td>
                          <td className="px-4 py-3.5 text-xs text-ink">{reservation.client.name}</td>
                          <td className="px-4 py-3.5 text-xs text-forest/55">{reservation._count.services}</td>
                          <td className="px-4 py-3.5">
                            <Badge tone={reservationTone(reservation.status)}>
                              {RESERVATION_STATUS_LABEL[reservation.status]}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            {reservation.origin_partner_id === company.id ? <a
                              href={"/api/documentos/voucher/" + reservation.id}
                              target="_blank"
                              rel="noreferrer"
                              className="focus-ring rounded text-xs font-semibold text-forest hover:text-forest-light"
                            >
                              Voucher
                            </a> : <span className="text-xs font-medium text-forest/55">Atendimento Nativos</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          )}

          {isSupplier && (
            <section className="surface-panel overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-forest/10 px-5 py-4">
                <div>
                  <h2 className="section-heading">Próximos serviços</h2>
                  <p className="mt-1 text-xs text-forest/58">Agenda confirmada e aguardando resposta.</p>
                </div>
                <Link href="/portal/empresa/operacao" className="focus-ring inline-flex items-center gap-1 rounded text-xs font-semibold text-forest">
                  Ver operação
                  <ArrowRight size={13} aria-hidden="true" />
                </Link>
              </div>
              {supplierServices.length === 0 ? (
                <p className="px-5 py-12 text-center text-sm text-forest/58">Nenhum serviço programado.</p>
              ) : (
                <ul className="divide-y divide-forest/[0.075]">
                  {supplierServices.map((service) => (
                    <li key={service.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                      <span className="flex min-w-14 shrink-0 flex-col rounded-lg bg-forest/[0.055] px-2 py-1.5 text-center">
                        <strong className="text-xs text-forest">
                          {service.scheduled_date?.toLocaleDateString("pt-BR", { timeZone: "UTC", day: "2-digit", month: "short" }) ?? "A definir"}
                        </strong>
                        <span className="text-[11px] text-forest/55">{service.scheduled_time ?? "—"}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate text-xs text-ink">{service.reservation.client.name}</strong>
                        <span className="mt-1 block truncate text-[11px] text-forest/60">
                          {service.reservation.code} · {SERVICE_TYPE_LABEL[service.type] ?? service.type}
                        </span>
                        <span className="mt-1 block truncate text-[11px] text-forest/55">
                          {service.driver?.name ?? "Motorista a definir"}
                        </span>
                      </span>
                      <Badge tone={service.acceptance_status === "aceito" ? "success" : "warning"}>
                        {service.acceptance_status === "aceito" ? "Confirmado" : "Aguardando aceite"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>

        <aside className="surface-elevated overflow-hidden">
          <div className="border-b border-forest/10 px-5 py-4">
            <h2 className="section-heading">Ações necessárias</h2>
            <p className="mt-1 text-xs text-forest/58">Atalhos para as tarefas mais importantes.</p>
          </div>
          <ul className="divide-y divide-forest/[0.075]">
            {isSupplier && (
              <li>
                <Link href="/portal/empresa/operacao" className="group flex gap-3 px-5 py-4 hover:bg-forest/[0.025]">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning-light text-warning">
                    <BadgeCheck size={15} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block text-xs text-forest">Confirmar serviços</strong>
                    <span className="mt-1 block text-[11px] text-forest/58">{pendingAcceptance} aguardando sua resposta</span>
                  </span>
                  <ArrowRight size={14} className="mt-2 text-forest/32 group-hover:text-forest" aria-hidden="true" />
                </Link>
              </li>
            )}
            {isPartner && (
              <li>
                <Link href="/portal/empresa/reservas#nova-reserva" className="group flex gap-3 px-5 py-4 hover:bg-forest/[0.025]">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold/12 text-[#856737]">
                    <Plus size={15} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block text-xs text-forest">Solicitar reserva</strong>
                    <span className="mt-1 block text-[11px] text-forest/58">Envie os dados para a equipe Nativos</span>
                  </span>
                  <ArrowRight size={14} className="mt-2 text-forest/32 group-hover:text-forest" aria-hidden="true" />
                </Link>
              </li>
            )}
            <li>
              <Link href="/portal/empresa/solicitacoes" className="group flex gap-3 px-5 py-4 hover:bg-forest/[0.025]">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-info-light text-info">
                  <Inbox size={15} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-xs text-forest">Acompanhar solicitações</strong>
                  <span className="mt-1 block text-[11px] text-forest/58">{requests} em andamento</span>
                </span>
                <ArrowRight size={14} className="mt-2 text-forest/32 group-hover:text-forest" aria-hidden="true" />
              </Link>
            </li>
            {isSupplier && (
              <li>
                <Link href="/portal/empresa/equipe" className="group flex gap-3 px-5 py-4 hover:bg-forest/[0.025]">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-forest/[0.07] text-forest">
                    <Users size={15} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block text-xs text-forest">Atualizar equipe</strong>
                    <span className="mt-1 block text-[11px] text-forest/58">Motoristas e veículos cadastrados</span>
                  </span>
                  <ArrowRight size={14} className="mt-2 text-forest/32 group-hover:text-forest" aria-hidden="true" />
                </Link>
              </li>
            )}
          </ul>
        </aside>
      </div>
    </div>
  );
}
