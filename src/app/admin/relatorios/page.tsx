import Link from "next/link";
import { Download, FileBarChart, Search } from "lucide-react";
import { requireFinancialUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { inputClass, secondaryButtonClass } from "@/lib/ui";
import { MetricCard } from "@/components/ui/metric-card";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const date = (value: string | undefined, fallback: Date) => {
  const parsed = value ? new Date(`${value}T00:00:00.000Z`) : fallback;
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
};

export default async function RelatoriosPage({ searchParams }: { searchParams: Promise<{ empresa?: string; de?: string; ate?: string; status?: string }> }) {
  await requireFinancialUser();
  const params = await searchParams;
  const today = new Date();
  const defaultFrom = new Date(today); defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 30); defaultFrom.setUTCHours(0, 0, 0, 0);
  const from = date(params.de, defaultFrom);
  const to = date(params.ate, today); to.setUTCHours(23, 59, 59, 999);
  const [companies, selectedCompany] = await Promise.all([
    prisma.company.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    params.empresa ? prisma.company.findUnique({ where: { id: params.empresa }, select: { id: true, name: true, document: true, roles: true, commission_enabled: true, commission: true, billing_limit: true } }) : null,
  ]);
  const reservations = await prisma.reservation.findMany({
    where: {
      created_at: { gte: from, lte: to },
      ...(params.status ? { status: params.status as never } : {}),
      ...(selectedCompany ? { OR: [{ origin_partner_id: selectedCompany.id }, { services: { some: { supplier_id: selectedCompany.id } } }] } : {}),
    },
    include: { client: { select: { name: true } }, origin_partner: { select: { name: true } }, services: { include: { supplier: { select: { name: true } }, driver: { select: { name: true } }, vehicle: { select: { plate: true, model: true } }, service_expenses: { where: { status: { not: "rejeitado" } }, select: { amount: true } } } } },
    orderBy: { created_at: "desc" }, take: 500,
  });
  const relevantParty = selectedCompany ? { party_type: { in: ["fornecedor", "parceiro"] as never[] }, party_id: selectedCompany.id } : undefined;
  const entries = await prisma.financeEntry.findMany({ where: { created_at: { gte: from, lte: to }, ...(relevantParty ?? {}) }, include: { payments: { where: { reversed_at: null, estorno_of_id: null }, select: { amount: true } }, compensacao: { select: { amount: true, status: true, reversed_at: true } } } });
  const serviceRows = reservations.flatMap((reservation) => reservation.services.filter((service) => !selectedCompany || service.supplier_id === selectedCompany.id || reservation.origin_partner_id === selectedCompany.id).map((service) => ({ reservation, service })));
  const gross = serviceRows.reduce((sum, row) => sum + Number(row.service.price), 0);
  const costs = serviceRows.reduce((sum, row) => sum + row.service.service_expenses.reduce((total, expense) => total + Number(expense.amount), 0) + Number(row.service.supplier_cost ?? 0), 0);
  const received = entries.filter((entry) => entry.type === "receita").reduce((sum, entry) => sum + entry.payments.reduce((total, payment) => total + Number(payment.amount), 0), 0);
  const open = entries.reduce((sum, entry) => { const paid = entry.payments.reduce((total, payment) => total + Number(payment.amount), 0); const compensated = entry.compensacao?.status === "confirmada" && !entry.compensacao.reversed_at ? Number(entry.compensacao.amount) : 0; return sum + Math.max(0, Number(entry.amount) - paid - compensated); }, 0);

  return <div className="mx-auto max-w-[1480px] space-y-6">
    <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="eyebrow">Controladoria</p><h1 className="page-heading mt-1">Relatórios gerenciais</h1><p className="page-description">Visão auditável da operação, empresas, reservas, custos e recebimentos.</p></div><Link href="/api/admin/relatorios/export" className={secondaryButtonClass}><Download size={15} /> Exportar CSV</Link></header>
    <form className="surface-panel grid gap-3 p-4 md:grid-cols-[minmax(220px,1fr)_160px_160px_180px_auto]" action="/admin/relatorios" method="get"><label className="relative md:col-span-2"><span className="sr-only">Empresa</span><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-forest/38" /><select name="empresa" defaultValue={params.empresa ?? ""} className={`${inputClass} pl-9`}><option value="">Todas as empresas</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label><label><span className="sr-only">De</span><input type="date" name="de" defaultValue={params.de} className={inputClass} /></label><label><span className="sr-only">Até</span><input type="date" name="ate" defaultValue={params.ate} className={inputClass} /></label><select name="status" defaultValue={params.status ?? ""} className={inputClass}><option value="">Todos os status</option><option value="confirmado">Confirmadas</option><option value="concluido">Concluídas</option><option value="cancelado">Canceladas</option></select><button className={secondaryButtonClass}>Aplicar filtros</button></form>
    {selectedCompany && <section className="surface-panel border-l-4 border-gold p-5"><p className="eyebrow">Dossiê da empresa</p><h2 className="mt-1 text-xl font-semibold text-forest">{selectedCompany.name}</h2><p className="mt-1 text-xs text-forest/55">{selectedCompany.document ?? "Documento não informado"} · {selectedCompany.roles.join(" + ")}</p></section>}
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6"><MetricCard icon={FileBarChart} label="Reservas" value={String(reservations.length)} accent="forest" /><MetricCard icon={FileBarChart} label="Serviços" value={String(serviceRows.length)} accent="gold" /><MetricCard icon={FileBarChart} label="Valor bruto" value={money.format(gross)} accent="success" /><MetricCard icon={FileBarChart} label="Custos" value={money.format(costs)} accent="warning" /><MetricCard icon={FileBarChart} label="Recebido" value={money.format(received)} accent="success" /><MetricCard icon={FileBarChart} label="Saldo em aberto" value={money.format(open)} accent="danger" /></section>
    <section className="surface-panel overflow-hidden"><div className="border-b border-forest/10 px-5 py-4"><h2 className="section-heading">Detalhamento por serviço</h2><p className="mt-1 text-xs text-forest/46">{serviceRows.length} serviços no período selecionado. Valores calculados a partir dos registros financeiros e operacionais.</p></div>{serviceRows.length === 0 ? <p className="px-5 py-12 text-center text-sm text-forest/46">Nenhum registro encontrado.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-sm"><thead><tr>{["Reserva", "Data", "Cliente", "Empresa", "Motorista", "Veículo", "Bruto", "Custos", "Líquido"].map((label) => <th key={label} className="bg-[#faf9f6] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">{label}</th>)}</tr></thead><tbody>{serviceRows.map(({ reservation, service }) => { const expense = service.service_expenses.reduce((sum, item) => sum + Number(item.amount), 0); const cost = expense + Number(service.supplier_cost ?? 0); return <tr key={service.id} className="border-t border-forest/[0.075]"><td className="px-4 py-3.5"><Link href={`/admin/reservas/${reservation.id}`} className="font-semibold text-forest underline">{reservation.code}</Link></td><td className="px-4 py-3.5 text-xs text-forest/60">{service.scheduled_date?.toLocaleDateString("pt-BR", { timeZone: "UTC" }) ?? "—"}</td><td className="px-4 py-3.5 text-xs">{reservation.client.name}</td><td className="px-4 py-3.5 text-xs">{service.supplier?.name ?? reservation.origin_partner?.name ?? "Nativos"}</td><td className="px-4 py-3.5 text-xs">{service.driver?.name ?? "A definir"}</td><td className="px-4 py-3.5 text-xs">{service.vehicle ? `${service.vehicle.plate} · ${service.vehicle.model}` : "—"}</td><td className="px-4 py-3.5 text-xs font-semibold">{money.format(Number(service.price))}</td><td className="px-4 py-3.5 text-xs text-danger">{money.format(cost)}</td><td className="px-4 py-3.5 text-xs font-semibold text-success">{money.format(Math.max(0, Number(service.price) - cost))}</td></tr>; })}</tbody></table></div>}</section>
    <p className="text-xs text-forest/45">Relatório gerado em {new Date().toLocaleString("pt-BR", { timeZone: "America/Bahia" })}. A exportação respeita os mesmos filtros e permissões desta tela.</p>
  </div>;
}
