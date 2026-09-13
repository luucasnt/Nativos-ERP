import { redirect } from "next/navigation";
import { BadgeCheck, CalendarDays, MapPin, Route } from "lucide-react";
import { DirectCollectionActions } from "@/components/portal/direct-collection-actions";
import { ServiceAcceptanceActions } from "@/components/portal/service-acceptance-actions";
import { ServiceExecutionActions } from "@/components/portal/service-execution-actions";
import { Badge } from "@/components/ui/badge";
import { requireCompanyPortalUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { SERVICE_TYPE_LABEL } from "@/lib/reservations/service-type-labels";
import {
  confirmNotReceivedPortalEmpresa,
  confirmReceivedPortalEmpresa,
} from "../actions";

function executionTone(status: string): "success" | "info" | "neutral" {
  if (status === "concluido") return "success";
  if (status === "em_andamento") return "info";
  return "neutral";
}

const EXECUTION_LABEL: Record<string, string> = {
  agendado: "Agendado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
};

export default async function PortalEmpresaOperacaoPage() {
  const user = await requireCompanyPortalUser();
  const company = user.linked_company;

  if (!company.roles.includes("fornecedor")) {
    redirect("/portal/empresa");
  }

  const [pendingAcceptance, activeServices, awaitingCollection, reasons] = await Promise.all([
    prisma.service.findMany({
      where: {
        supplier_id: company.id,
        acceptance_status: "aguardando_aceite",
        execution_status: "agendado",
      },
      include: {
        reservation: { include: { client: true } },
        driver: true,
        vehicle: true,
      },
      orderBy: [{ scheduled_date: "asc" }, { scheduled_time: "asc" }],
    }),
    prisma.service.findMany({
      where: {
        supplier_id: company.id,
        acceptance_status: "aceito",
        execution_status: { in: ["agendado", "em_andamento"] },
      },
      include: {
        reservation: { include: { client: true } },
        driver: true,
        vehicle: true,
      },
      orderBy: [{ scheduled_date: "asc" }, { scheduled_time: "asc" }],
    }),
    prisma.service.findMany({
      where: {
        supplier_id: company.id,
        collection_actor: "fornecedor",
        execution_status: "concluido",
        direct_collections: { none: {} },
      },
      include: { reservation: { include: { client: true } } },
      orderBy: { scheduled_date: "desc" },
    }),
    prisma.catalogItem.findMany({
      where: { type: "motivo_perda", active: true },
      orderBy: { order: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <header>
        <p className="eyebrow">Portal do fornecedor</p>
        <h1 className="page-heading mt-1">Minha operação</h1>
        <p className="page-description">Confirme chamados e acompanhe a execução dos serviços da sua equipe.</p>
      </header>

      <section className="surface-panel overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-forest/10 px-5 py-4">
          <div>
            <h2 className="section-heading">Aguardando sua confirmação</h2>
            <p className="mt-1 text-xs text-forest/46">Responda rapidamente para garantir a alocação.</p>
          </div>
          <span className="rounded-full bg-warning-light px-2.5 py-1 text-xs font-semibold text-warning">
            {pendingAcceptance.length}
          </span>
        </div>

        {pendingAcceptance.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <BadgeCheck size={30} className="mx-auto text-success/45" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-forest">Nenhuma confirmação pendente</p>
            <p className="mt-1 text-xs text-forest/46">Sua fila de aceite está em dia.</p>
          </div>
        ) : (
          <ul className="divide-y divide-forest/[0.075]">
            {pendingAcceptance.map((service) => (
              <li key={service.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[120px_minmax(0,1fr)_minmax(280px,auto)] lg:items-center">
                <div>
                  <strong className="block text-sm text-forest">
                    {service.scheduled_date?.toLocaleDateString("pt-BR", { timeZone: "UTC", day: "2-digit", month: "short" }) ?? "A definir"}
                  </strong>
                  <span className="mt-1 block text-xs text-forest/46">{service.scheduled_time ?? "Horário a definir"}</span>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{service.reservation.client.name}</p>
                  <p className="mt-1 text-xs text-forest/52">
                    {service.reservation.code} · {SERVICE_TYPE_LABEL[service.type] ?? service.type}
                  </p>
                  <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-forest/42">
                    <MapPin size={11} aria-hidden="true" />
                    {service.pickup_location ?? "Origem não informada"} → {service.dropoff_location ?? "Destino não informado"}
                  </p>
                </div>
                <ServiceAcceptanceActions serviceId={service.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="surface-panel overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-forest/10 px-5 py-4">
          <div>
            <h2 className="section-heading">Serviços confirmados</h2>
            <p className="mt-1 text-xs text-forest/46">Agenda ativa dos motoristas da empresa.</p>
          </div>
          <Route size={18} className="text-gold" aria-hidden="true" />
        </div>

        {activeServices.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <CalendarDays size={30} className="mx-auto text-forest/22" aria-hidden="true" />
            <p className="mt-3 text-sm text-forest/46">Nenhum serviço ativo.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[930px] text-sm">
              <thead>
                <tr>
                  <th className="bg-[#faf9f6] px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Data e hora</th>
                  <th className="bg-[#faf9f6] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Reserva</th>
                  <th className="bg-[#faf9f6] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Serviço</th>
                  <th className="bg-[#faf9f6] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Motorista / veículo</th>
                  <th className="bg-[#faf9f6] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Status</th>
                  <th className="bg-[#faf9f6] px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Ações</th>
                </tr>
              </thead>
              <tbody>
                {activeServices.map((service) => (
                  <tr key={service.id} className="border-t border-forest/[0.075] align-middle hover:bg-forest/[0.022]">
                    <td className="px-5 py-3.5">
                      <p className="text-xs font-semibold text-forest">
                        {service.scheduled_date?.toLocaleDateString("pt-BR", { timeZone: "UTC" }) ?? "A definir"}
                      </p>
                      <p className="mt-1 text-[11px] text-forest/45">{service.scheduled_time ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-xs font-medium text-ink">{service.reservation.client.name}</p>
                      <p className="mt-1 text-[10px] text-forest/42">{service.reservation.code}</p>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-forest/65">{SERVICE_TYPE_LABEL[service.type] ?? service.type}</td>
                    <td className="px-4 py-3.5">
                      <p className="text-xs text-ink/75">{service.driver?.name ?? "A definir"}</p>
                      <p className="mt-1 text-[10px] text-forest/42">
                        {service.vehicle ? service.vehicle.model + " · " + service.vehicle.plate : "Veículo a definir"}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge tone={executionTone(service.execution_status)}>
                        {EXECUTION_LABEL[service.execution_status] ?? service.execution_status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-3">
                        <ServiceExecutionActions serviceId={service.id} executionStatus={service.execution_status} />
                        <a
                          href={"/api/documentos/os/" + service.id}
                          target="_blank"
                          rel="noreferrer"
                          className="focus-ring rounded text-xs font-semibold text-forest hover:text-forest-light"
                        >
                          OS
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {awaitingCollection.length > 0 && (
        <section className="surface-panel overflow-hidden">
          <div className="border-b border-forest/10 px-5 py-4">
            <h2 className="section-heading">Confirmação de recebimento direto</h2>
            <p className="mt-1 text-xs text-forest/46">Confirme valores recebidos diretamente do passageiro.</p>
          </div>
          <ul className="divide-y divide-forest/[0.075]">
            {awaitingCollection.map((service) => (
              <li key={service.id} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center">
                <span className="min-w-0 flex-1">
                  <strong className="block text-xs text-ink">{service.reservation.client.name}</strong>
                  <span className="mt-1 block text-[11px] text-forest/46">
                    {service.reservation.code} · {SERVICE_TYPE_LABEL[service.type] ?? service.type}
                  </span>
                </span>
                <DirectCollectionActions
                  serviceId={service.id}
                  reasons={reasons}
                  onConfirmReceived={confirmReceivedPortalEmpresa}
                  onConfirmNotReceived={confirmNotReceivedPortalEmpresa}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

