import Link from "next/link";
import {
  ClipboardList,
  FileCheck2,
  FileText,
  ReceiptText,
  Sheet,
} from "lucide-react";
import { MetricCard } from "@/components/ui/metric-card";
import { prisma } from "@/lib/prisma";
import { SERVICE_TYPE_LABEL } from "@/lib/reservations/service-type-labels";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function DocumentLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="focus-ring inline-flex min-h-8 items-center rounded-lg border border-forest/12 bg-white px-2.5 text-[11px] font-semibold text-forest transition hover:border-forest/25 hover:bg-forest/[0.03]"
    >
      {label}
    </a>
  );
}

export default async function DocumentosPage() {
  const [reservations, services, payments, billingCycles] = await Promise.all([
    prisma.reservation.findMany({
      orderBy: { updated_at: "desc" },
      take: 20,
      include: { client: true, _count: { select: { services: true } } },
    }),
    prisma.service.findMany({
      orderBy: { updated_at: "desc" },
      take: 20,
      include: {
        reservation: { include: { client: true } },
        driver: true,
      },
    }),
    prisma.payment.findMany({
      where: { reversed_at: null },
      orderBy: { created_at: "desc" },
      take: 20,
      include: {
        finance_entry: { include: { reservation: true } },
      },
    }),
    prisma.billingCycle.findMany({
      orderBy: [{ period: "desc" }, { updated_at: "desc" }],
      take: 20,
      include: { company: true },
    }),
  ]);

  const signs = services.filter(
    (service) => service.reception_sign_enabled && service.reception_passenger_name,
  );

  return (
    <div className="mx-auto max-w-[1460px] space-y-6">
      <header>
        <p className="eyebrow">Central de emissão</p>
        <h1 className="page-heading mt-1">Documentos</h1>
        <p className="page-description">
          Gere os documentos oficiais a partir dos dados atuais do sistema, sem cópias paralelas.
        </p>
      </header>

      <section aria-label="Resumo de documentos" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={FileText} label="Reservas disponíveis" value={String(reservations.length)} accent="forest" />
        <MetricCard icon={ClipboardList} label="Ordens de serviço" value={String(services.length)} accent="info" />
        <MetricCard icon={ReceiptText} label="Recibos recentes" value={String(payments.length)} accent="success" />
        <MetricCard icon={Sheet} label="Faturas" value={String(billingCycles.length)} accent="gold" />
      </section>

      <section className="surface-panel overflow-hidden">
        <div className="border-b border-forest/10 px-5 py-4">
          <h2 className="section-heading">Reservas</h2>
          <p className="mt-1 text-xs text-forest/46">Voucher, orçamento e contrato usam a mesma reserva como fonte.</p>
        </div>
        {reservations.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-forest/46">Nenhuma reserva disponível.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-sm">
              <thead>
                <tr>
                  <th className="bg-[#faf9f6] px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Reserva</th>
                  <th className="bg-[#faf9f6] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Cliente</th>
                  <th className="bg-[#faf9f6] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Serviços</th>
                  <th className="bg-[#faf9f6] px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Gerar</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((reservation) => (
                  <tr key={reservation.id} className="border-t border-forest/[0.075] hover:bg-forest/[0.022]">
                    <td className="px-5 py-3.5">
                      <Link href={"/admin/reservas/" + reservation.id} className="focus-ring rounded text-xs font-semibold text-forest">
                        {reservation.code}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-ink">{reservation.client.name}</td>
                    <td className="px-4 py-3.5 text-xs text-forest/48">{reservation._count.services}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-2">
                        <DocumentLink href={"/api/documentos/voucher/" + reservation.id} label="Voucher" />
                        <DocumentLink href={"/api/documentos/orcamento/" + reservation.id} label="Orçamento" />
                        <DocumentLink href={"/api/documentos/contrato/" + reservation.id} label="Contrato" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="surface-panel overflow-hidden">
          <div className="border-b border-forest/10 px-5 py-4">
            <h2 className="section-heading">Ordens de serviço</h2>
            <p className="mt-1 text-xs text-forest/46">Documentos operacionais por serviço.</p>
          </div>
          <ul className="divide-y divide-forest/[0.075]">
            {services.slice(0, 12).map((service) => (
              <li key={service.id} className="flex items-center gap-3 px-5 py-3.5">
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-xs text-ink">{service.reservation.client.name}</strong>
                  <span className="mt-1 block truncate text-[10px] text-forest/43">
                    {service.reservation.code} · {SERVICE_TYPE_LABEL[service.type] ?? service.type}
                  </span>
                </span>
                <DocumentLink href={"/api/documentos/os/" + service.id} label="OS" />
                {service.reception_sign_enabled && service.reception_passenger_name && (
                  <DocumentLink href={"/api/documentos/plaquinha/" + service.id} label="Plaquinha" />
                )}
              </li>
            ))}
          </ul>
          {signs.length === 0 && services.length > 0 && (
            <p className="border-t border-forest/10 px-5 py-3 text-[10px] text-forest/42">
              Plaquinhas aparecem quando habilitadas no serviço.
            </p>
          )}
        </section>

        <section className="surface-panel overflow-hidden">
          <div className="border-b border-forest/10 px-5 py-4">
            <h2 className="section-heading">Recibos</h2>
            <p className="mt-1 text-xs text-forest/46">Comprovantes dos pagamentos registrados.</p>
          </div>
          {payments.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-forest/46">Nenhum pagamento registrado.</p>
          ) : (
            <ul className="divide-y divide-forest/[0.075]">
              {payments.slice(0, 12).map((payment) => (
                <li key={payment.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="min-w-0 flex-1">
                    <strong className="block text-xs text-ink">{money.format(Number(payment.amount))}</strong>
                    <span className="mt-1 block text-[10px] text-forest/43">
                      {payment.finance_entry.reservation?.code ?? "Sem reserva"} · {payment.created_at.toLocaleDateString("pt-BR")}
                    </span>
                  </span>
                  <DocumentLink href={"/api/documentos/recibo/" + payment.id} label="Recibo" />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="surface-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-forest/10 px-5 py-4">
          <div>
            <h2 className="section-heading">Faturas</h2>
            <p className="mt-1 text-xs text-forest/46">Ciclos de cobrança de parceiros faturados.</p>
          </div>
          <FileCheck2 size={18} className="text-gold" aria-hidden="true" />
        </div>
        {billingCycles.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-forest/46">Nenhum ciclo de faturamento disponível.</p>
        ) : (
          <ul className="divide-y divide-forest/[0.075]">
            {billingCycles.map((cycle) => (
              <li key={cycle.id} className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center">
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-xs text-ink">{cycle.company.name}</strong>
                  <span className="mt-1 block text-[10px] text-forest/43">
                    {cycle.period} · {cycle.status.replaceAll("_", " ")}
                  </span>
                </span>
                <strong className="text-xs text-forest">{money.format(Number(cycle.total_amount))}</strong>
                <DocumentLink href={"/api/documentos/fatura/" + cycle.id} label="Fatura PDF" />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

