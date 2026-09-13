import { CalendarDays, MapPin, Navigation, Route } from "lucide-react";
import { DirectCollectionActions } from "@/components/portal/direct-collection-actions";
import { ServiceExecutionActions } from "@/components/portal/service-execution-actions";
import { Badge } from "@/components/ui/badge";
import { requireDriverPortalUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { SERVICE_TYPE_LABEL } from "@/lib/reservations/service-type-labels";
import { confirmNotReceivedPortal, confirmReceivedPortal } from "../actions";

function mapUrl(origin: string | null, destination: string | null) {
  const params = new URLSearchParams({ api: "1" });
  if (origin) params.set("origin", origin);
  if (destination) params.set("destination", destination);
  return "https://www.google.com/maps/dir/?" + params.toString();
}

export default async function PortalMotoristaServicosPage() {
  const user = await requireDriverPortalUser();
  const driver = user.linked_driver;

  const [services, awaitingCollection, reasons] = await Promise.all([
    prisma.service.findMany({
      where: {
        driver_id: driver.id,
        execution_status: { in: ["agendado", "em_andamento"] },
      },
      include: {
        reservation: { include: { client: true } },
        vehicle: true,
      },
      orderBy: [{ scheduled_date: "asc" }, { scheduled_time: "asc" }],
      take: 60,
    }),
    prisma.service.findMany({
      where: {
        driver_id: driver.id,
        collection_actor: "motorista_proprio",
        execution_status: "concluido",
        direct_collections: { none: {} },
      },
      include: { reservation: { include: { client: true } } },
      orderBy: { scheduled_date: "desc" },
      take: 30,
    }),
    prisma.catalogItem.findMany({
      where: { type: "motivo_perda", active: true },
      orderBy: { order: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-[1160px] space-y-6">
      <header>
        <p className="eyebrow">Agenda operacional</p>
        <h1 className="page-heading mt-1">Meus serviços</h1>
        <p className="page-description">Consulte os detalhes, abra a rota e atualize a execução de cada serviço.</p>
      </header>

      {services.length === 0 ? (
        <section className="surface-panel px-5 py-14 text-center">
          <CalendarDays size={32} className="mx-auto text-forest/22" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-forest">Nenhum serviço ativo</p>
          <p className="mt-1 text-xs text-forest/46">Novos serviços aparecerão automaticamente aqui.</p>
        </section>
      ) : (
        <section className="grid gap-4">
          {services.map((service) => (
            <article id={service.id} key={service.id} className="surface-panel scroll-mt-24 overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-forest/10 bg-[#faf9f6] px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-forest/[0.07] px-3 py-2 text-center">
                    <strong className="block text-xs text-forest">
                      {service.scheduled_date?.toLocaleDateString("pt-BR", {
                        timeZone: "UTC",
                        day: "2-digit",
                        month: "short",
                      }) ?? "A definir"}
                    </strong>
                    <span className="mt-0.5 block text-[10px] text-forest/43">{service.scheduled_time ?? "—"}</span>
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-forest">{SERVICE_TYPE_LABEL[service.type] ?? service.type}</h2>
                    <p className="mt-1 text-[11px] text-forest/45">{service.reservation.code}</p>
                  </div>
                </div>
                <Badge tone={service.execution_status === "em_andamento" ? "info" : "neutral"}>
                  {service.execution_status === "em_andamento" ? "Em andamento" : "Agendado"}
                </Badge>
              </div>

              <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{service.reservation.client.name}</p>
                  <p className="mt-2 flex items-start gap-2 text-xs leading-5 text-forest/58">
                    <MapPin size={14} className="mt-0.5 shrink-0 text-gold" aria-hidden="true" />
                    {service.pickup_location ?? "Origem não informada"} → {service.dropoff_location ?? "Destino não informado"}
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-xs text-forest/48">
                    <Route size={14} className="text-gold" aria-hidden="true" />
                    {service.passenger_count ?? "—"} passageiros · {service.vehicle ? service.vehicle.model + " · " + service.vehicle.plate : "Veículo a definir"}
                  </p>
                  {service.flight_number && (
                    <p className="mt-2 text-xs text-forest/48">Voo: {service.flight_number}</p>
                  )}
                  {service.notes && (
                    <p className="mt-3 rounded-lg bg-warning-light px-3 py-2 text-xs leading-5 text-warning">{service.notes}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:max-w-64 lg:justify-end">
                  <ServiceExecutionActions serviceId={service.id} executionStatus={service.execution_status} />
                  {(service.pickup_location || service.dropoff_location) && (
                    <a
                      href={mapUrl(service.pickup_location, service.dropoff_location)}
                      target="_blank"
                      rel="noreferrer"
                      className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg border border-forest/16 bg-white px-3 text-xs font-semibold text-forest hover:bg-forest/[0.035]"
                    >
                      <Navigation size={14} aria-hidden="true" />
                      Rota
                    </a>
                  )}
                  <a
                    href={"/api/documentos/os/" + service.id}
                    target="_blank"
                    rel="noreferrer"
                    className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-lg border border-forest/16 bg-white px-3 text-xs font-semibold text-forest hover:bg-forest/[0.035]"
                  >
                    OS
                  </a>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {awaitingCollection.length > 0 && (
        <section className="surface-panel overflow-hidden">
          <div className="border-b border-forest/10 px-5 py-4">
            <h2 className="section-heading">Recebimentos diretos pendentes</h2>
            <p className="mt-1 text-xs text-forest/46">Confirme se o pagamento do passageiro foi recebido.</p>
          </div>
          <ul className="divide-y divide-forest/[0.075]">
            {awaitingCollection.map((service) => (
              <li key={service.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <span className="min-w-0 flex-1">
                  <strong className="block text-xs text-ink">{service.reservation.client.name}</strong>
                  <span className="mt-1 block text-[11px] text-forest/46">
                    {service.reservation.code} · {SERVICE_TYPE_LABEL[service.type] ?? service.type}
                  </span>
                </span>
                <DirectCollectionActions
                  serviceId={service.id}
                  reasons={reasons}
                  onConfirmReceived={confirmReceivedPortal}
                  onConfirmNotReceived={confirmNotReceivedPortal}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

