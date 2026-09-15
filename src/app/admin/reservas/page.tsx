import Link from "next/link";
import type { Prisma, ReservationStatus } from "@prisma/client";
import { CalendarDays, ChevronLeft, ChevronRight, Filter, Plus, Search, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionNavigation } from "@/components/ui/section-navigation";
import { prisma } from "@/lib/prisma";
import { RESERVATION_STATUS_LABEL } from "@/lib/reservations/status-labels";
import { SERVICE_TYPE_LABEL } from "@/lib/reservations/service-type-labels";
import { buttonClass, inputClass, secondaryButtonClass } from "@/lib/ui";

const PAGE_SIZE = 25;
const TABS = [
  { key: "todas", label: "Todas", statuses: null },
  { key: "pendentes", label: "Pendentes", statuses: ["rascunho", "pendente"] },
  { key: "confirmadas", label: "Confirmadas", statuses: ["confirmado"] },
  { key: "andamento", label: "Em andamento", statuses: ["em_andamento"] },
  { key: "concluidas", label: "Concluídas", statuses: ["concluido"] },
  { key: "canceladas", label: "Canceladas", statuses: ["cancelado", "rejeitado"] },
] as const;

type SearchParams = { tab?: string; q?: string; de?: string; ate?: string; parceiro?: string; fornecedor?: string; financeiro?: string; page?: string };
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function statusTone(status: ReservationStatus): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "confirmado" || status === "concluido") return "success";
  if (status === "pendente" || status === "rascunho") return "warning";
  if (status === "cancelado" || status === "rejeitado") return "danger";
  if (status === "em_andamento") return "info";
  return "neutral";
}

function parseDate(value: string | undefined, end = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  return new Date(`${value}T${end ? "23:59:59.999" : "00:00:00.000"}Z`);
}

function listHref(params: SearchParams, changes: Record<string, string | undefined>) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, ...changes })) if (value) next.set(key, value);
  return `/admin/reservas?${next.toString()}`;
}

export default async function ReservasPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const tab = TABS.find((item) => item.key === params.tab) ?? TABS[0];
  const query = params.q?.trim() ?? "";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const dateFrom = parseDate(params.de);
  const dateTo = parseDate(params.ate, true);
  const where: Prisma.ReservationWhereInput = {
    ...(tab.statuses ? { status: { in: [...tab.statuses] } } : {}),
    ...(params.parceiro ? { origin_partner_id: params.parceiro } : {}),
    ...(params.fornecedor || dateFrom || dateTo ? { services: { some: {
      execution_status: { not: "cancelado" },
      ...(params.fornecedor ? { supplier_id: params.fornecedor } : {}),
      ...(dateFrom || dateTo ? { scheduled_date: { ...(dateFrom ? { gte: dateFrom } : {}), ...(dateTo ? { lte: dateTo } : {}) } } : {}),
    } } } : {}),
    ...(params.financeiro === "aberto" ? { finance_entries: { some: { status: { in: ["programado", "pendente", "vencido"] }, reversed_at: null } } } : {}),
    ...(params.financeiro === "pago" ? { finance_entries: { some: { status: "pago", reversed_at: null } } } : {}),
  };
  if (query) where.OR = [
    { code: { contains: query, mode: "insensitive" } },
    { client: { is: { name: { contains: query, mode: "insensitive" } } } },
    { client: { is: { phone: { contains: query, mode: "insensitive" } } } },
    { client: { is: { email: { contains: query, mode: "insensitive" } } } },
    { origin_partner: { is: { name: { contains: query, mode: "insensitive" } } } },
    { services: { some: { pickup_location: { contains: query, mode: "insensitive" } } } },
    { services: { some: { dropoff_location: { contains: query, mode: "insensitive" } } } },
    { services: { some: { supplier: { is: { name: { contains: query, mode: "insensitive" } } } } } },
    {
      services: {
        some: {
          driver: { is: { name: { contains: query, mode: "insensitive" } } },
        },
      },
    },
  ];

  const [groups, total, reservations, companies] = await Promise.all([
    prisma.reservation.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.reservation.count({ where }),
    prisma.reservation.findMany({
      where, orderBy: [{ created_at: "desc" }, { id: "desc" }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
      select: {
        id: true, code: true, status: true, has_partial_cancellation: true,
        client: { select: { name: true } }, origin_partner: { select: { name: true } },
        services: { where: { execution_status: { not: "cancelado" } }, orderBy: [{ scheduled_date: "asc" }, { scheduled_time: "asc" }], select: {
          type: true, scheduled_date: true, scheduled_time: true, pickup_location: true, dropoff_location: true, price: true,
          supplier: { select: { name: true } },
        } },
      },
    }),
    prisma.company.findMany({ where: { roles: { hasSome: ["parceiro", "fornecedor"] } }, orderBy: { name: "asc" }, select: { id: true, name: true, roles: true } }),
  ]);
  const counts = new Map(groups.map((group) => [group.status, group._count._all]));
  const tabCount = (item: (typeof TABS)[number]) => item.statuses ? item.statuses.reduce((sum, status) => sum + (counts.get(status) ?? 0), 0) : groups.reduce((sum, group) => sum + group._count._all, 0);
  const partners = companies.filter((company) => company.roles.includes("parceiro"));
  const suppliers = companies.filter((company) => company.roles.includes("fornecedor"));
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeAdvancedFilters = [
    params.de,
    params.ate,
    params.parceiro,
    params.fornecedor,
    params.financeiro,
  ].filter(Boolean).length;

  return <div className="mx-auto max-w-[1480px] space-y-5">
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="eyebrow">Central operacional</p><h1 className="page-heading mt-1">Reservas</h1><p className="page-description">Localize, acompanhe e resolva cada reserva sem sair do fluxo.</p></div>
      <Link href="/admin/reservas/novo" className={`${buttonClass} w-full sm:w-auto`}><Plus size={16} /> Nova reserva</Link>
    </header>

    <SectionNavigation
      activeKey={tab.key}
      ariaLabel="Status das reservas"
      mobileLabel="Mostrar reservas"
      items={TABS.map((item) => ({
        key: item.key,
        label: item.label,
        count: tabCount(item),
        href: listHref(params, { tab: item.key, page: undefined }),
      }))}
    />

    <form action="/admin/reservas" method="get" className="surface-panel p-3 lg:hidden">
      <input type="hidden" name="tab" value={tab.key} />
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <label className="relative"><span className="sr-only">Buscar reserva</span><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-forest/55" /><input name="q" defaultValue={query} placeholder="Código, cliente ou rota" className={`${inputClass} pl-9`} /></label>
        <button type="submit" className={`${secondaryButtonClass} px-3`} aria-label="Buscar"><Search size={17} /></button>
      </div>
      <details className="group mt-2 border-t border-forest/10 pt-2">
        <summary className="focus-ring flex min-h-10 cursor-pointer list-none items-center justify-between rounded-lg px-2 text-sm font-medium text-forest [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2"><SlidersHorizontal size={16} /> Mais filtros</span>
          {activeAdvancedFilters > 0 && <span className="rounded-full bg-gold/15 px-2 py-1 text-xs text-forest">{activeAdvancedFilters} ativos</span>}
        </summary>
        <div className="mt-3 grid gap-3 border-t border-forest/10 pt-3">
          <label className="grid gap-1"><span className="text-xs font-medium text-forest/65">Data inicial</span><input type="date" name="de" defaultValue={params.de ?? ""} className={inputClass} /></label>
          <label className="grid gap-1"><span className="text-xs font-medium text-forest/65">Data final</span><input type="date" name="ate" defaultValue={params.ate ?? ""} className={inputClass} /></label>
          <label className="grid gap-1"><span className="text-xs font-medium text-forest/65">Parceiro</span><select name="parceiro" defaultValue={params.parceiro ?? ""} className={inputClass}><option value="">Todos os parceiros</option>{partners.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="grid gap-1"><span className="text-xs font-medium text-forest/65">Fornecedor</span><select name="fornecedor" defaultValue={params.fornecedor ?? ""} className={inputClass}><option value="">Todos os fornecedores</option>{suppliers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="grid gap-1"><span className="text-xs font-medium text-forest/65">Situação financeira</span><select name="financeiro" defaultValue={params.financeiro ?? ""} className={inputClass}><option value="">Qualquer financeiro</option><option value="aberto">Com saldo em aberto</option><option value="pago">Com pagamento</option></select></label>
          <div className="grid grid-cols-2 gap-2"><Link href={`/admin/reservas?tab=${tab.key}`} className={secondaryButtonClass}>Limpar</Link><button type="submit" className={buttonClass}><Filter size={15} /> Aplicar</button></div>
        </div>
      </details>
    </form>

    <form action="/admin/reservas" method="get" className="surface-panel hidden gap-3 p-4 lg:grid lg:grid-cols-2 xl:grid-cols-4">
      <input type="hidden" name="tab" value={tab.key} />
      <label className="relative lg:col-span-2"><span className="sr-only">Buscar reserva</span><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-forest/55" /><input name="q" defaultValue={query} placeholder="Código, cliente, telefone, rota..." className={`${inputClass} pl-9`} /></label>
      <input aria-label="Data inicial" type="date" name="de" defaultValue={params.de ?? ""} className={inputClass} />
      <input aria-label="Data final" type="date" name="ate" defaultValue={params.ate ?? ""} className={inputClass} />
      <select aria-label="Parceiro" name="parceiro" defaultValue={params.parceiro ?? ""} className={inputClass}><option value="">Todos os parceiros</option>{partners.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <select aria-label="Fornecedor" name="fornecedor" defaultValue={params.fornecedor ?? ""} className={inputClass}><option value="">Todos os fornecedores</option>{suppliers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <select aria-label="Situação financeira" name="financeiro" defaultValue={params.financeiro ?? ""} className={inputClass}><option value="">Qualquer financeiro</option><option value="aberto">Com saldo em aberto</option><option value="pago">Com pagamento</option></select>
      <button type="submit" className={secondaryButtonClass}><Filter size={15} /> Filtrar</button>
    </form>

    {reservations.length === 0 ? <section className="surface-panel px-5 py-14 text-center"><CalendarDays className="mx-auto text-forest/25" size={34} /><h2 className="mt-3 text-base font-semibold text-forest">Nenhuma reserva encontrada</h2><p className="mt-1 text-sm text-forest/55">Ajuste os filtros ou cadastre uma nova reserva.</p><div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row"><Link href={`/admin/reservas?tab=${tab.key}`} className={secondaryButtonClass}>Limpar filtros</Link><Link href="/admin/reservas/novo" className={buttonClass}>Nova reserva</Link></div></section> :
      <section className="surface-panel overflow-hidden">
        <div className="hidden overflow-x-auto xl:block"><table className="w-full min-w-[980px] text-sm"><thead><tr>{["Reserva","Próximo serviço","Rota","Parceiro / fornecedor","Valor","Status",""].map((label) => <th key={label} className="bg-[#faf9f6] px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-forest/60">{label}</th>)}</tr></thead><tbody>
          {reservations.map((reservation) => { const service = reservation.services[0]; const totalValue = reservation.services.reduce((sum, item) => sum + Number(item.price), 0); return <tr key={reservation.id} className="border-t border-forest/[0.075] align-middle hover:bg-forest/[0.022]">
            <td className="px-4 py-4"><strong className="block text-forest">{reservation.code}</strong><span className="mt-1 block text-sm text-forest/58">{reservation.client.name}</span></td>
            <td className="px-4 py-4 text-sm text-forest/68">{service?.scheduled_date ? service.scheduled_date.toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "Sem data"}{service?.scheduled_time ? ` · ${service.scheduled_time}` : ""}<span className="mt-1 block text-xs text-forest/58">{service ? SERVICE_TYPE_LABEL[service.type] : "Sem serviço"}</span></td>
            <td className="max-w-[240px] px-4 py-4 text-sm text-forest/68"><span className="block truncate">{service?.pickup_location ?? "—"}</span><span className="block truncate text-xs text-forest/58">{service?.dropoff_location ? `para ${service.dropoff_location}` : ""}</span></td>
            <td className="px-4 py-4 text-sm text-forest/68">{reservation.origin_partner?.name ?? "Cliente direto"}<span className="mt-1 block text-xs text-forest/58">{service?.supplier?.name ?? "Operação própria"}</span></td>
            <td className="px-4 py-4 font-semibold text-forest">{money.format(totalValue)}</td><td className="px-4 py-4"><Badge tone={statusTone(reservation.status)}>{RESERVATION_STATUS_LABEL[reservation.status]}</Badge>{reservation.has_partial_cancellation && <span className="mt-1 block text-xs text-warning">Cancelamento parcial</span>}</td>
            <td className="px-4 py-4 text-right"><Link href={`/admin/reservas/${reservation.id}`} className="focus-ring rounded text-sm font-semibold text-forest hover:text-forest-light">Abrir</Link></td>
          </tr>; })}
        </tbody></table></div>
        <div className="divide-y divide-forest/10 xl:hidden">{reservations.map((reservation) => { const service = reservation.services[0]; const totalValue = reservation.services.reduce((sum, item) => sum + Number(item.price), 0); return <Link key={reservation.id} href={`/admin/reservas/${reservation.id}`} className="focus-ring block p-4 active:bg-forest/[0.035]">
          <div className="flex items-start justify-between gap-3"><div><strong className="text-base text-forest">{reservation.code}</strong><p className="mt-1 text-sm font-medium text-ink">{reservation.client.name}</p></div><Badge tone={statusTone(reservation.status)}>{RESERVATION_STATUS_LABEL[reservation.status]}</Badge></div>
          <div className="mt-4 grid grid-cols-[82px_1fr] gap-x-3 gap-y-2 text-sm"><span className="text-forest/60">Data</span><span className="font-medium text-forest">{service?.scheduled_date ? service.scheduled_date.toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "Sem data"}{service?.scheduled_time ? ` · ${service.scheduled_time}` : ""}</span><span className="text-forest/60">Rota</span><span className="truncate text-forest/72">{service?.pickup_location ?? "—"}{service?.dropoff_location ? ` → ${service.dropoff_location}` : ""}</span><span className="text-forest/60">Valor</span><strong className="text-forest">{money.format(totalValue)}</strong></div>
        </Link>; })}</div>
      </section>}

    <footer className="flex flex-col items-center justify-between gap-3 text-sm text-forest/55 sm:flex-row"><span>{total} {total === 1 ? "reserva encontrada" : "reservas encontradas"} · página {page} de {totalPages}</span><div className="flex gap-2"><Link aria-disabled={page <= 1} href={page <= 1 ? "#" : listHref(params, { page: String(page - 1) })} className={`${secondaryButtonClass} ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}><ChevronLeft size={15} /> Anterior</Link><Link aria-disabled={page >= totalPages} href={page >= totalPages ? "#" : listHref(params, { page: String(page + 1) })} className={`${secondaryButtonClass} ${page >= totalPages ? "pointer-events-none opacity-40" : ""}`}>Próxima <ChevronRight size={15} /></Link></div></footer>
  </div>;
}
