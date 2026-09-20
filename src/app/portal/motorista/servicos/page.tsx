import {
  CalendarDays,
  FileText,
  MapPin,
  Navigation,
  PhoneCall,
  Route,
} from "lucide-react";
import { DirectCollectionActions } from "@/components/portal/direct-collection-actions";
import { ServiceExecutionActions } from "@/components/portal/service-execution-actions";
import { ServiceChecklist } from "@/components/portal/service-checklist";
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
      select: {
        id: true,
        type: true,
        execution_status: true,
        scheduled_date: true,
        scheduled_time: true,
        pickup_location: true,
        dropoff_location: true,
        passenger_count: true,
        flight_number: true,
        notes: true,
        reception_sign_enabled: true,
        reception_passenger_name: true,
        preflight_checklist: true,
        completion_checklist: true,
        incident_notes: true,
        reservation: { select: { code: true, client: { select: { name: true, phone: true } } } },
        vehicle: { select: { model: true, plate: true } },
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
      select: {
        id: true,
        type: true,
        reservation: { select: { code: true, client: { select: { name: true } } } },
      },
      orderBy: { scheduled_date: "desc" },
      take: 30,
    }),
    prisma.catalogItem.findMany({
      where: { type: "motivo_perda", active: true },
      orderBy: { order: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-[1160px] space-y-5 sm:space-y-6">
      <header>
        <p className="eyebrow">Agenda operacional</p>
        <h1 className="page-heading mt-1">Meus serviços</h1>
        <p className="page-description">
          Consulte os detalhes, abra a rota e atualize a execução de cada
          serviço.
        </p>
      </header>

      {services.length === 0 ? (
        <section className="surface-panel px-5 py-14 text-center">
          <CalendarDays
            size={32}
            className="mx-auto text-forest/22"
            aria-hidden="true"
          />
          <p className="mt-3 text-sm font-medium text-forest">
            Nenhum serviço ativo
          </p>
          <p className="mt-1 text-xs text-forest/58">
            Novos serviços aparecerão automaticamente aqui.
          </p>
        </section>
      ) : (
        <section className="grid gap-4">
          {services.map((service) => (
            <article
              id={service.id}
              key={service.id}
              className="surface-panel scroll-mt-24 overflow-hidden"
            >
              <div className="flex items-center justify-between gap-3 border-b border-forest/10 bg-[#faf9f6] px-4 py-3.5 sm:px-5">
                <div className="flex items-center gap-3">
                  <span className="rounded-lg bg-forest/[0.07] px-3 py-2 text-center">
                    <strong className="block text-xs text-forest">
                      {service.scheduled_date?.toLocaleDateString("pt-BR", {
                        timeZone: "UTC",
                        day: "2-digit",
                        month: "short",
                      }) ?? "A definir"}
                    </strong>
                    <span className="mt-0.5 block text-[11px] text-forest/55">
                      {service.scheduled_time ?? "—"}
                    </span>
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-forest">
                      {SERVICE_TYPE_LABEL[service.type] ?? service.type}
                    </h2>
                    <p className="mt-1 text-[11px] text-forest/58">
                      {service.reservation.code}
                    </p>
                  </div>
                </div>
                <Badge
                  tone={
                    service.execution_status === "em_andamento"
                      ? "info"
                      : "neutral"
                  }
                >
                  {service.execution_status === "em_andamento"
                    ? "Em andamento"
                    : "Agendado"}
                </Badge>
              </div>

                <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">
                    {service.reservation.client.name}
                  </p>
                  {service.reservation.client.phone && (
                    <p className="mt-1 text-xs text-forest/62">
                      {service.reservation.client.phone}
                    </p>
                  )}
                  <div className="mt-3 flex items-start gap-2 text-xs leading-5 text-forest/68">
                    <MapPin
                      size={14}
                      className="mt-0.5 shrink-0 text-gold"
                      aria-hidden="true"
                    />
                    <p className="grid min-w-0 gap-1.5">
                      <span>
                        <strong className="font-semibold text-forest">
                          Origem:
                        </strong>{" "}
                        {service.pickup_location ?? "Não informada"}
                      </span>
                      <span>
                        <strong className="font-semibold text-forest">
                          Destino:
                        </strong>{" "}
                        {service.dropoff_location ?? "Não informado"}
                      </span>
                    </p>
                  </div>
                  <p className="mt-2 flex items-center gap-2 text-xs text-forest/60">
                    <Route size={14} className="text-gold" aria-hidden="true" />
                    {service.passenger_count ?? "—"} passageiros ·{" "}
                    {service.vehicle
                      ? service.vehicle.model + " · " + service.vehicle.plate
                      : "Veículo a definir"}
                  </p>
                  {service.flight_number && (
                    <p className="mt-2 text-xs text-forest/60">
                      Voo: {service.flight_number}
                    </p>
                  )}
                  {service.notes && (
                    <p className="mt-3 rounded-lg bg-warning-light px-3 py-2 text-xs leading-5 text-warning">
                      {service.notes}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center lg:max-w-72 lg:justify-end">
                  <ServiceExecutionActions
                    serviceId={service.id}
                    executionStatus={service.execution_status}
                  />
                  {(service.pickup_location || service.dropoff_location) && (
                    <a
                      href={mapUrl(
                        service.pickup_location,
                        service.dropoff_location,
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-forest/16 bg-white px-3 text-xs font-semibold text-forest hover:bg-forest/[0.035]"
                    >
                      <Navigation size={14} aria-hidden="true" />
                      Rota
                    </a>
                  )}
                  {service.reservation.client.phone && (
                    <a
                      href={
                        "tel:" +
                        service.reservation.client.phone.replace(/[^\d+]/g, "")
                      }
                      className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-forest/16 bg-white px-3 text-xs font-semibold text-forest hover:bg-forest/[0.035]"
                    >
                      <PhoneCall size={14} aria-hidden="true" />
                      Ligar
                    </a>
                  )}
                  <a
                    href={"/api/documentos/os/" + service.id}
                    target="_blank"
                    rel="noreferrer"
                    className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-forest/16 bg-white px-3 text-xs font-semibold text-forest hover:bg-forest/[0.035]"
                  >
                    <FileText size={14} aria-hidden="true" />
                    OS
                  </a>
                  {service.reception_sign_enabled && service.reception_passenger_name && (
                    <a
                      href={`/api/documentos/plaquinha/${service.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="focus-ring col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-forest/16 bg-white px-3 text-xs font-semibold text-forest hover:bg-forest/[0.035] sm:col-span-1"
                    >
                      <FileText size={14} aria-hidden="true" />
                      Plaquinha
                    </a>
                  )}
                </div>
              </div>
              <div className="grid gap-4 border-t border-forest/10 bg-[#faf9f6] p-4 sm:p-5">
                <ServiceChecklist serviceId={service.id} phase="preflight" initialValue={service.preflight_checklist as Record<string, boolean> | null} />
                {service.execution_status === "em_andamento" && <ServiceChecklist serviceId={service.id} phase="completion" initialValue={service.completion_checklist as Record<string, boolean> | null} />}
              </div>
            </article>
          ))}
        </section>
      )}

      {awaitingCollection.length > 0 && (
        <section className="surface-panel overflow-hidden">
          <div className="border-b border-forest/10 px-5 py-4">
            <h2 className="section-heading">Recebimentos diretos pendentes</h2>
            <p className="mt-1 text-xs text-forest/58">
              Confirme se o pagamento do passageiro foi recebido.
            </p>
          </div>
          <ul className="divide-y divide-forest/[0.075]">
            {awaitingCollection.map((service) => (
              <li
                key={service.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
              >
                <span className="min-w-0 flex-1">
                  <strong className="block text-xs text-ink">
                    {service.reservation.client.name}
                  </strong>
                  <span className="mt-1 block text-[11px] text-forest/58">
                    {service.reservation.code} ·{" "}
                    {SERVICE_TYPE_LABEL[service.type] ?? service.type}
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
