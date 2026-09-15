import { BarChart3, CalendarDays, CheckCircle2, Route, WalletCards } from "lucide-react";
import { MetricCard } from "@/components/ui/metric-card";
import { Badge } from "@/components/ui/badge";
import { requireCompanyPortalUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";

export default async function PartnerReportsPage() {
  const user = await requireCompanyPortalUser();
  const company = user.linked_company;
  if (!company.roles.includes("parceiro")) return null;
  const where = { origin_partner_id: company.id };
  const [total, confirmed, open, cancelled, services, upcoming] = await Promise.all([
    prisma.reservation.count({ where }),
    prisma.reservation.count({ where: { ...where, status: { in: ["confirmado", "em_andamento", "concluido"] } } }),
    prisma.reservation.count({ where: { ...where, status: { in: ["rascunho", "pendente"] } } }),
    prisma.reservation.count({ where: { ...where, status: { in: ["cancelado", "rejeitado"] } } }),
    prisma.service.count({ where: { reservation: where } }),
    prisma.service.findMany({ where: { reservation: where, execution_status: { in: ["agendado", "em_andamento"] } }, include: { reservation: { select: { code: true, status: true, client: { select: { name: true } } } } }, orderBy: [{ scheduled_date: "asc" }, { scheduled_time: "asc" }], take: 12 }),
  ]);
  return <div className="mx-auto max-w-[1280px] space-y-6">
    <header><p className="eyebrow">Visão gerencial</p><h1 className="page-heading mt-1">Relatórios</h1><p className="page-description">Acompanhe o volume da sua operação e os próximos atendimentos.</p></header>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard icon={CalendarDays} label="Total de reservas" value={String(total)} accent="forest" />
      <MetricCard icon={CheckCircle2} label="Confirmadas/concluídas" value={String(confirmed)} accent="success" />
      <MetricCard icon={WalletCards} label="Em análise" value={String(open)} accent="gold" />
      <MetricCard icon={BarChart3} label="Serviços cadastrados" value={String(services)} accent="info" />
    </section>
    <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
      <article className="surface-panel p-5"><h2 className="section-heading">Distribuição das reservas</h2><div className="mt-4 space-y-3"><div className="flex justify-between text-sm"><span>Confirmadas e concluídas</span><strong>{confirmed}</strong></div><div className="h-2 rounded-full bg-forest/10"><div className="h-2 rounded-full bg-success" style={{ width: `${total ? (confirmed / total) * 100 : 0}%` }} /></div><div className="flex justify-between text-sm"><span>Pendentes</span><strong>{open}</strong></div><div className="h-2 rounded-full bg-forest/10"><div className="h-2 rounded-full bg-gold" style={{ width: `${total ? (open / total) * 100 : 0}%` }} /></div><div className="flex justify-between text-sm"><span>Canceladas</span><strong>{cancelled}</strong></div></div></article>
      <article className="surface-panel p-5"><div className="flex items-center gap-2"><Route size={17} className="text-gold" /><h2 className="section-heading">Próximos serviços</h2></div><div className="mt-4 space-y-3">{upcoming.length ? upcoming.map((service) => <div key={service.id} className="flex items-center justify-between gap-3 rounded-lg bg-[#faf9f6] p-3"><div><p className="text-xs font-semibold text-forest">{service.reservation.code} · {service.reservation.client.name}</p><p className="mt-1 text-xs text-forest/55">{service.scheduled_date?.toLocaleDateString("pt-BR", { timeZone: "UTC" }) ?? "Data a definir"} · {service.scheduled_time ?? "Horário a definir"}</p></div><Badge tone={service.execution_status === "em_andamento" ? "info" : "neutral"}>{service.execution_status === "em_andamento" ? "Em andamento" : "Agendado"}</Badge></div>) : <p className="text-sm text-forest/62">Nenhum serviço próximo.</p>}</div></article>
    </section>
  </div>;
}
