import Link from "next/link";
import { BriefcaseBusiness, CalendarDays, WalletCards } from "lucide-react";
import { MetricCard } from "@/components/ui/metric-card";
import { requireDriverPortalUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { SERVICE_TYPE_LABEL } from "@/lib/reservations/service-type-labels";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateKey = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bahia" }).format(date);

export default async function MotoristaProducaoPage() {
  const user = await requireDriverPortalUser();
  const driver = user.linked_driver;
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);

  const [services, entries] = await Promise.all([
    prisma.service.findMany({
      where: { driver_id: driver.id, execution_status: "concluido", completed_at: { gte: start } },
      select: { id: true, price: true, completed_at: true, scheduled_date: true, type: true, reservation: { select: { code: true } } },
      orderBy: { completed_at: "desc" },
    }),
    prisma.financeEntry.findMany({
      where: { party_type: "motorista", party_id: driver.id, type: "despesa", created_at: { gte: start }, reversed_at: null },
      select: { amount: true, status: true, auto_key: true },
    }),
  ]);

  const commissionEntries = entries.filter((entry) => entry.auto_key?.startsWith("svc:") && entry.auto_key.endsWith(":repasse_motorista"));
  const dailyEntries = entries.filter((entry) => entry.auto_key?.startsWith("driver_daily:"));
  const earned = [...commissionEntries, ...dailyEntries].reduce((sum, entry) => sum + Number(entry.amount), 0);
  const pending = entries.filter((entry) => ["programado", "pendente", "vencido"].includes(entry.status)).reduce((sum, entry) => sum + Number(entry.amount), 0);
  const days = new Set(services.map((service) => service.completed_at ?? service.scheduled_date).filter(Boolean).map((date) => dateKey(date!))).size;

  return (
    <div className="mx-auto max-w-[1180px] space-y-6">
      <header>
        <p className="eyebrow">Competência atual</p>
        <h1 className="page-heading mt-1">Minha produção</h1>
        <p className="page-description">Serviços concluídos e remuneração calculada automaticamente conforme seu modelo de pagamento.</p>
      </header>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={BriefcaseBusiness} label="Serviços concluídos" value={String(services.length)} accent="forest" />
        <MetricCard icon={CalendarDays} label="Diárias produzidas" value={String(days)} accent="gold" />
        <MetricCard icon={WalletCards} label="Remuneração calculada" value={money.format(earned)} accent="success" />
        <MetricCard icon={WalletCards} label="Em aberto" value={money.format(pending)} accent="warning" />
      </section>
      <section className="surface-panel overflow-hidden">
        <div className="border-b border-forest/10 px-5 py-4">
          <h2 className="section-heading">Produção por serviço</h2>
          <p className="mt-1 text-xs text-forest/58">O valor final é gerado no encerramento do serviço e protegido contra duplicidade.</p>
        </div>
        {services.length === 0 ? <p className="px-5 py-12 text-center text-sm text-forest/58">Nenhum serviço concluído neste mês.</p> : (<>
          <ul className="divide-y divide-forest/[0.075] xl:hidden">
            {services.map((service) => (
              <li key={service.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-forest/60">
                      {(service.completed_at ?? service.scheduled_date)?.toLocaleDateString("pt-BR", { timeZone: "America/Bahia" }) ?? "—"}
                    </p>
                    <strong className="mt-1 block truncate text-sm text-forest">
                      Reserva {service.reservation.code}
                    </strong>
                  </div>
                  <strong className="shrink-0 text-sm text-forest">
                    {money.format(Number(service.price))}
                  </strong>
                </div>
                <p className="mt-3 text-sm text-forest/65">
                  {SERVICE_TYPE_LABEL[service.type] ?? service.type}
                </p>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto scrollbar-clean xl:block"><table className="w-full min-w-[620px] text-sm"><thead><tr>
            {['Data', 'Reserva', 'Serviço', 'Valor do serviço'].map((label) => <th key={label} className="bg-[#faf9f6] px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-forest/55">{label}</th>)}
          </tr></thead><tbody>{services.map((service) => <tr key={service.id} className="border-t border-forest/[0.075]">
            <td className="px-5 py-3.5 text-xs text-forest/55">{(service.completed_at ?? service.scheduled_date)?.toLocaleDateString('pt-BR', { timeZone: 'America/Bahia' }) ?? '—'}</td>
            <td className="px-5 py-3.5 text-xs font-semibold text-forest">{service.reservation.code}</td>
            <td className="px-5 py-3.5 text-xs text-forest/65">{SERVICE_TYPE_LABEL[service.type] ?? service.type}</td>
            <td className="px-5 py-3.5 text-xs font-semibold text-forest">{money.format(Number(service.price))}</td>
          </tr>)}</tbody></table></div>
        </>)}
      </section>
      <p className="text-xs text-forest/58">Despesas aprovadas aparecem no <Link href="/portal/motorista/financeiro" className="font-semibold text-forest underline">Financeiro</Link> e não alteram silenciosamente a produção bruta.</p>
    </div>
  );
}
