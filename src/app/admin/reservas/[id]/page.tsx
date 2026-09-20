import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Car, FileCheck2, FileText, History, MapPin, Plus, Receipt, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionNavigation } from "@/components/ui/section-navigation";
import { CancelReservationButton } from "@/components/admin/cancel-reservation-button";
import { RejectReservationButton } from "@/components/admin/reject-reservation-button";
import { RegisterPaymentForm } from "@/components/admin/register-payment-form";
import { canAccessFinance, getCurrentUser } from "@/lib/auth/get-current-user";
import { FINANCE_ENTRY_CATEGORY_LABEL, FINANCE_ENTRY_STATUS_LABEL } from "@/lib/finance/labels";
import { prisma } from "@/lib/prisma";
import { RESERVATION_STATUS_LABEL } from "@/lib/reservations/status-labels";
import { SERVICE_TYPE_LABEL } from "@/lib/reservations/service-type-labels";
import { buttonClass, secondaryButtonClass } from "@/lib/ui";
import { registerPayment } from "../../financeiro/actions";
import { updateReservation } from "../actions";
import { ReservationForm } from "../reservation-form";

const TABS = [
  { key: "resumo", label: "Resumo" }, { key: "servicos", label: "Serviços" },
  { key: "financeiro", label: "Financeiro" }, { key: "documentos", label: "Documentos" },
  { key: "historico", label: "Histórico" }, { key: "dados", label: "Editar dados" },
] as const;
type TabKey = (typeof TABS)[number]["key"];
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function financeTone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "pago") return "success"; if (status === "vencido") return "danger";
  if (status === "pendente") return "warning"; return "neutral";
}
function tabHref(id: string, tab: TabKey) { return `/admin/reservas/${id}?tab=${tab}`; }

export default async function ReservaDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const tab = (TABS.some((item) => item.key === query.tab) ? query.tab : "resumo") as TabKey;
  const [reservation, user] = await Promise.all([
    prisma.reservation.findUnique({
      where: { id },
      include: {
        client: true, origin_partner: true,
        services: { orderBy: [{ scheduled_date: "asc" }, { scheduled_time: "asc" }], include: { supplier: true, driver: true, vehicle: true } },
        finance_entries: { where: { reversed_at: null, status: { not: "cancelado" } }, orderBy: { created_at: "desc" }, include: { payments: { where: { reversed_at: null, estorno_of_id: null }, orderBy: { created_at: "desc" } } } },
        billing_cycle_reservations: { include: { billing_cycle: true } },
        change_requests: { orderBy: { created_at: "desc" }, take: 10 },
      },
    }),
    getCurrentUser(),
  ]);
  if (!reservation || !user) notFound();
  const financeAllowed = canAccessFinance(user);
  const activeServices = reservation.services.filter((service) => service.execution_status !== "cancelado");
  const nextService = activeServices.find((service) => !service.scheduled_date || service.scheduled_date >= new Date()) ?? activeServices[0];
  const sold = activeServices.reduce((sum, service) => sum + Number(service.price), 0);
  const revenue = reservation.finance_entries.filter((entry) => entry.type === "receita").reduce((sum, entry) => sum + Number(entry.amount), 0);
  const expense = reservation.finance_entries.filter((entry) => entry.type === "despesa").reduce((sum, entry) => sum + Number(entry.amount), 0);
  const tax = Number(reservation.tax_amount ?? 0);
  const paidRevenue = reservation.finance_entries.filter((entry) => entry.type === "receita").flatMap((entry) => entry.payments).reduce((sum, payment) => sum + Number(payment.amount), 0);
  const profit = revenue - expense - tax;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const relationshipLabel = reservation.origin_partner
    ? `Atendimento conduzido por ${reservation.origin_partner.name}`
    : reservation.referrer_type
      ? "Indicação · atendimento conduzido pela Nativos"
      : "Cliente direto · atendimento conduzido pela Nativos";
  const bankAccounts = financeAllowed && tab === "financeiro" ? await prisma.bankAccount.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }) : [];

  let clients: Array<{ id: string; name: string }> = [], partners: Array<{ id: string; name: string }> = [], companies: Array<{ id: string; name: string }> = [], drivers: Array<{ id: string; name: string }> = [];
  if (tab === "dados") {
    clients = [{ id: reservation.client.id, name: reservation.client.name }];
    if (reservation.origin_partner) partners = [{ id: reservation.origin_partner.id, name: reservation.origin_partner.name }];
    if (reservation.referrer_id && reservation.referrer_type === "company") {
      const company = await prisma.company.findUnique({ where: { id: reservation.referrer_id }, select: { id: true, name: true } });
      if (company) companies = [company];
    } else if (reservation.referrer_id && reservation.referrer_type === "driver") {
      const driver = await prisma.driver.findUnique({ where: { id: reservation.referrer_id }, select: { id: true, name: true } });
      if (driver) drivers = [driver];
    } else if (reservation.referrer_id && reservation.referrer_type === "client") {
      const client = await prisma.client.findUnique({ where: { id: reservation.referrer_id }, select: { id: true, name: true } });
      if (client) clients.push(client);
    }
  }
  const history = tab === "historico" ? await prisma.auditLog.findMany({ where: { OR: [{ entity_id: id }, { entity_id: { in: reservation.services.map((service) => service.id) } }] }, include: { actor: { select: { display_name: true, native_name: true, email: true } } }, orderBy: { created_at: "desc" }, take: 50 }) : [];

  return <div className="mx-auto max-w-[1380px] space-y-5">
    <header className="operational-strip p-4 sm:p-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start"><div><div className="flex flex-wrap items-center gap-2"><h1 className="page-heading">{reservation.code}</h1><Badge tone={reservation.status === "cancelado" || reservation.status === "rejeitado" ? "danger" : reservation.status === "pendente" || reservation.status === "rascunho" ? "warning" : "success"}>{RESERVATION_STATUS_LABEL[reservation.status]}</Badge>{reservation.has_partial_cancellation && <Badge tone="warning">Cancelamento parcial</Badge>}</div><p className="mt-2 text-base font-medium text-ink">{reservation.client.name}</p><p className="mt-1 text-sm text-forest/55">{relationshipLabel} · {activeServices.length} {activeServices.length === 1 ? "serviço ativo" : "serviços ativos"}</p></div>
        {!['cancelado','rejeitado'].includes(reservation.status) && <div className="flex flex-col gap-2 sm:flex-row"><CancelReservationButton reservationId={id} />{['rascunho','pendente'].includes(reservation.status) && <RejectReservationButton reservationId={id} />}</div>}
      </div>
      {nextService && <div className="mt-5 grid gap-3 rounded-xl bg-forest/[0.045] p-3 text-sm sm:grid-cols-3"><span className="flex items-center gap-2 text-forest"><CalendarDays size={16} className="text-gold" />{nextService.scheduled_date ? nextService.scheduled_date.toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "Data pendente"}{nextService.scheduled_time ? ` · ${nextService.scheduled_time}` : ""}</span><span className="flex min-w-0 items-center gap-2 text-forest"><MapPin size={16} className="shrink-0 text-gold" /><span className="truncate">{nextService.pickup_location ?? "Origem não informada"} → {nextService.dropoff_location ?? "Destino não informado"}</span></span><span className="flex items-center gap-2 text-forest"><Car size={16} className="text-gold" />{nextService.driver?.name ?? nextService.supplier?.name ?? "Recurso pendente"}</span></div>}
    </header>

    <SectionNavigation
      activeKey={tab}
      ariaLabel="Áreas da reserva"
      mobileLabel="Área da reserva"
      items={TABS.map((item) => ({
        key: item.key,
        label: item.label,
        href: tabHref(id, item.key),
      }))}
    />

    {tab === "resumo" && <div className="space-y-5">
      {financeAllowed && <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><MetricCard icon={WalletCards} label="Valor da reserva" value={money.format(sold)} accent="gold" /><MetricCard icon={Receipt} label="Custos e impostos" value={money.format(expense + tax)} accent="danger" /><MetricCard icon={FileCheck2} label="Recebido" value={money.format(paidRevenue)} accent="success" /><MetricCard icon={WalletCards} label="Lucro previsto" value={money.format(profit)} accent={profit >= 0 ? "success" : "warning"} trend={{ direction: profit >= 0 ? "up" : "down", label: `margem ${margin.toFixed(1)}%`, tone: profit >= 0 ? "positive" : "negative" }} /></section>}
      <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><section className="surface-panel p-5"><div className="flex items-center justify-between"><h2 className="section-heading">Operação</h2><Link href={tabHref(id,"servicos")} className="text-sm font-semibold text-forest">Ver serviços</Link></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{activeServices.map((service) => <Link key={service.id} href={`/admin/reservas/${id}/servicos/${service.id}`} className="interactive-panel focus-ring rounded-xl border border-forest/10 p-4 hover:border-forest/25"><strong className="text-sm text-forest">{SERVICE_TYPE_LABEL[service.type]}</strong><p className="mt-2 text-sm text-forest/65">{service.pickup_location ?? "Origem pendente"} → {service.dropoff_location ?? "Destino pendente"}</p><p className="mt-2 text-xs text-forest/60">{service.driver?.name ?? service.supplier?.name ?? "Aguardando alocação"}</p></Link>)}</div></section>
        <section className="surface-panel p-5"><h2 className="section-heading">Pendências</h2><ul className="mt-4 space-y-3 text-sm">{activeServices.length === 0 && <li className="text-warning">Adicione ao menos um serviço.</li>}{activeServices.some((service) => !service.scheduled_date || !service.scheduled_time) && <li className="text-warning">Há serviço sem data ou horário.</li>}{activeServices.some((service) => service.execution_type === "propria" && (!service.driver_id || !service.vehicle_id)) && <li className="text-warning">Há operação própria sem motorista ou veículo.</li>}{activeServices.some((service) => service.acceptance_status !== "aceito") && <li className="text-warning">Há aceite pendente.</li>}{activeServices.length > 0 && activeServices.every((service) => service.scheduled_date && service.scheduled_time && service.acceptance_status === "aceito" && (service.execution_type !== "propria" || (service.driver_id && service.vehicle_id))) && <li className="text-success">Reserva pronta para operação.</li>}</ul></section>
      </div>
    </div>}

    {tab === "servicos" && <section className="space-y-4"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="section-heading">Serviços da reserva</h2><p className="mt-1 text-sm text-forest/55">Alocação, rota, aceite e execução em um único lugar.</p></div>{!['cancelado','rejeitado'].includes(reservation.status) && <Link href={`/admin/reservas/${id}/servicos/novo`} className={buttonClass}><Plus size={15} /> Adicionar serviço</Link>}</div><div className="grid gap-3">{reservation.services.map((service) => <Link key={service.id} href={`/admin/reservas/${id}/servicos/${service.id}`} className="surface-panel interactive-panel focus-ring grid gap-3 p-4 hover:border-forest/25 md:grid-cols-[1.1fr_1.3fr_1fr_auto] md:items-center"><div><strong className="text-forest">{SERVICE_TYPE_LABEL[service.type]}</strong><p className="mt-1 text-sm text-forest/62">{service.scheduled_date ? service.scheduled_date.toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "Sem data"}{service.scheduled_time ? ` · ${service.scheduled_time}` : ""}</p></div><p className="text-sm text-forest/68">{service.pickup_location ?? "—"} → {service.dropoff_location ?? "—"}</p><div><p className="text-sm font-medium text-forest">{service.driver?.name ?? service.supplier?.name ?? "Sem alocação"}</p><p className="mt-1 text-xs text-forest/60">{service.vehicle?.model ?? "Veículo pendente"}</p></div><div className="flex items-center justify-between gap-3 md:justify-end"><strong className="text-sm text-forest">{money.format(Number(service.price))}</strong><Badge tone={service.execution_status === "cancelado" ? "danger" : service.acceptance_status === "aceito" ? "success" : "warning"}>{service.execution_status === "cancelado" ? "Cancelado" : service.acceptance_status === "aceito" ? "Confirmado" : "Pendente"}</Badge></div></Link>)}</div></section>}

    {tab === "financeiro" && <section className="space-y-4">{!financeAllowed ? <div className="surface-panel p-6 text-sm text-forest/65">O detalhamento financeiro é restrito à administração e à equipe financeira.</div> : <><div className="grid gap-3 sm:grid-cols-3"><MetricCard icon={WalletCards} label="Valor vendido" value={money.format(sold)} accent="gold" /><MetricCard icon={Receipt} label="Custos + impostos" value={money.format(expense + tax)} accent="danger" /><MetricCard icon={WalletCards} label="Resultado previsto" value={money.format(profit)} accent={profit >= 0 ? "success" : "warning"} /></div><div className="grid gap-3">{reservation.finance_entries.map((entry) => { const paid = entry.payments.reduce((sum, payment) => sum + Number(payment.amount), 0); const remaining = Math.max(0, Number(entry.amount) - paid); return <article key={entry.id} className="surface-panel grid min-w-0 gap-4 p-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,.7fr)_minmax(0,.7fr)_minmax(220px,260px)] xl:items-center"><div className="min-w-0"><strong className="block break-words text-sm text-ink">{entry.description ?? FINANCE_ENTRY_CATEGORY_LABEL[entry.category]}</strong><p className="mt-1 text-xs text-forest/60">{FINANCE_ENTRY_CATEGORY_LABEL[entry.category]}</p></div><div><span className="block text-xs text-forest/60">{entry.type === "receita" ? "Receita" : "Despesa"}</span><strong className={entry.type === "receita" ? "text-success" : "text-danger"}>{money.format(Number(entry.amount))}</strong>{paid > 0 && remaining > 0 && <span className="mt-1 block text-xs text-forest/62">Saldo {money.format(remaining)}</span>}</div><div><Badge tone={financeTone(entry.status)}>{FINANCE_ENTRY_STATUS_LABEL[entry.status]}</Badge></div><div className="min-w-0">{entry.payment_eligible && entry.status !== "pago" ? <RegisterPaymentForm entryId={entry.id} remainingAmount={remaining.toFixed(2)} bankAccounts={bankAccounts} onRegister={registerPayment} /> : entry.payments[0] ? <a href={`/api/documentos/recibo/${entry.payments[0].id}`} target="_blank" rel="noreferrer" className={`${secondaryButtonClass} w-full xl:w-auto`}>Abrir recibo</a> : <span className="text-sm text-forest/58">Aguardando conclusão do serviço</span>}</div></article>; })}{reservation.finance_entries.length === 0 && <div className="surface-panel p-8 text-center text-sm text-forest/55">Os lançamentos aparecerão quando os serviços forem confirmados.</div>}</div></>}</section>}

    {tab === "documentos" && <section className="space-y-5"><div><h2 className="section-heading">Documentos da reserva</h2><p className="mt-1 text-sm text-forest/55">Emita cada documento no contexto correto, sem procurar em outras telas.</p></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[["Voucher",`/api/documentos/voucher/${id}`],["Orçamento",`/api/documentos/orcamento/${id}`],["Contrato",`/api/documentos/contrato/${id}`]].map(([label,url]) => <a key={label} href={url} target="_blank" rel="noreferrer" className="surface-panel focus-ring flex min-h-24 items-center gap-3 p-4 hover:border-forest/25"><FileText className="text-gold" /><span><strong className="block text-forest">{label}</strong><span className="mt-1 block text-sm text-forest/62">Gerar PDF</span></span></a>)}</div><div className="grid gap-3 lg:grid-cols-2">{reservation.services.map((service) => <article key={service.id} className="surface-panel p-4"><strong className="text-sm text-forest">{SERVICE_TYPE_LABEL[service.type]}</strong><p className="mt-1 text-xs text-forest/60">{service.scheduled_date?.toLocaleDateString("pt-BR", { timeZone: "UTC" }) ?? "Sem data"}</p><div className="mt-4 flex flex-wrap gap-2"><a href={`/api/documentos/os/${service.id}`} target="_blank" rel="noreferrer" className={secondaryButtonClass}>Ordem de serviço</a>{service.reception_sign_enabled ? <a href={`/api/documentos/plaquinha/${service.id}`} target="_blank" rel="noreferrer" className={secondaryButtonClass}>Plaquinha</a> : <span className="rounded-lg bg-forest/[0.045] px-3 py-2 text-xs text-forest/58">Ative a plaquinha no serviço para emitir</span>}</div></article>)}</div>{reservation.finance_entries.some((entry) => entry.payments.length) && <div><h3 className="section-heading">Recibos</h3><div className="mt-3 flex flex-wrap gap-2">{reservation.finance_entries.flatMap((entry) => entry.payments).map((payment) => <a key={payment.id} href={`/api/documentos/recibo/${payment.id}`} target="_blank" rel="noreferrer" className={secondaryButtonClass}>Recibo · {money.format(Number(payment.amount))}</a>)}</div></div>}{reservation.billing_cycle_reservations.length > 0 && <div><h3 className="section-heading">Faturas</h3><div className="mt-3 flex flex-wrap gap-2">{reservation.billing_cycle_reservations.map(({ billing_cycle: cycle }) => <a key={cycle.id} href={`/api/documentos/fatura/${cycle.id}`} target="_blank" rel="noreferrer" className={secondaryButtonClass}>Fatura {cycle.period}</a>)}</div></div>}</section>}

    {tab === "historico" && <section className="surface-panel overflow-hidden"><div className="border-b border-forest/10 p-4"><h2 className="section-heading">Histórico auditável</h2></div><div className="divide-y divide-forest/10">{history.map((item) => <article key={item.id} className="relative flex gap-3 p-4 before:absolute before:bottom-0 before:left-[31px] before:top-12 before:w-px before:bg-forest/10 last:before:hidden"><span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold/25 bg-gold/10"><History size={15} className="text-[#806538]" /></span><div><strong className="text-sm text-forest">{item.action.replaceAll("_", " ")}</strong><p className="mt-1 text-xs text-forest/60">{item.actor?.display_name ?? item.actor?.native_name ?? item.actor?.email ?? "Sistema"} · {item.created_at.toLocaleString("pt-BR", { timeZone: "America/Bahia" })}</p></div></article>)}{history.length === 0 && <p className="p-8 text-center text-sm text-forest/55">Nenhuma alteração registrada.</p>}</div></section>}

    {tab === "dados" && <section className="surface-panel p-4 sm:p-6"><h2 className="section-heading mb-5">Dados comerciais</h2><ReservationForm action={updateReservation.bind(null,id)} clients={clients} partners={partners} companies={companies} drivers={drivers} cancelHref={`/admin/reservas/${id}`} defaultValues={{ client_id: reservation.client_id, origin_partner_id: reservation.origin_partner_id, referrer_type: reservation.referrer_type, referrer_id: reservation.referrer_id, referrer_name: reservation.referrer_name, referrer_document: reservation.referrer_document, commission_percent: reservation.commission_percent?.toString() ?? null, is_cortesia: reservation.is_cortesia, is_net_fare: reservation.is_net_fare, requires_nf: reservation.requires_nf, collection_mode: reservation.collection_mode, tax_percent_snapshot: reservation.tax_percent_snapshot?.toString() ?? null }} /></section>}
  </div>;
}
