import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  FileText,
  MapPin,
  Navigation,
  ReceiptText,
  Route,
  Users,
} from "lucide-react";
import { ServiceExecutionActions } from "@/components/portal/service-execution-actions";
import { Badge } from "@/components/ui/badge";
import { requireDriverPortalUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { SERVICE_TYPE_LABEL } from "@/lib/reservations/service-type-labels";

function bahiaDateKey(date: Date | null) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bahia",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function routeUrl(origin: string | null, destination: string | null) {
  const params = new URLSearchParams({ api: "1" });
  if (origin) params.set("origin", origin);
  if (destination) params.set("destination", destination);
  return "https://www.google.com/maps/dir/?" + params.toString();
}

export default async function PortalMotoristaHomePage() {
  const user = await requireDriverPortalUser();
  const driver = user.linked_driver;

  const services = await prisma.service.findMany({
    where: {
      driver_id: driver.id,
      execution_status: { in: ["agendado", "em_andamento"] },
    },
    include: {
      reservation: { include: { client: true } },
      vehicle: true,
    },
    orderBy: [{ scheduled_date: "asc" }, { scheduled_time: "asc" }],
    take: 30,
  });

  const nextService = services[0] ?? null;
  const todayKey = bahiaDateKey(new Date());
  const todayServices = services.filter((service) => bahiaDateKey(service.scheduled_date) === todayKey);
  const firstName = (user.display_name ?? driver.name).split(" ")[0];

  return (
    <div className="mx-auto max-w-[1180px] space-y-5">
      <header className="rounded-xl bg-forest px-5 py-5 text-cream md:bg-transparent md:px-0 md:py-0 md:text-ink">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gold">Portal do motorista</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-forest">Olá, {firstName}</h1>
        <p className="mt-1 text-xs text-cream/58 md:text-forest/52">
          {new Intl.DateTimeFormat("pt-BR", {
            timeZone: "America/Bahia",
            weekday: "long",
            day: "2-digit",
            month: "long",
          }).format(new Date())}
        </p>
      </header>

      {nextService ? (
        <section className="surface-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-forest/10 bg-[#faf9f6] px-5 py-3.5">
            <div>
              <p className="eyebrow">Próximo serviço</p>
              <h2 className="mt-1 text-sm font-semibold text-forest">{SERVICE_TYPE_LABEL[nextService.type] ?? nextService.type}</h2>
            </div>
            <Badge tone={nextService.execution_status === "em_andamento" ? "info" : "gold"}>
              {nextService.execution_status === "em_andamento" ? "Em andamento" : "Próximo"}
            </Badge>
          </div>

          <div className="p-5">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <div>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-semibold tracking-[-0.04em] text-forest">
                    {nextService.scheduled_time ?? "—"}
                  </span>
                  <span className="text-xs text-forest/46">
                    {nextService.scheduled_date?.toLocaleDateString("pt-BR", {
                      timeZone: "UTC",
                      day: "2-digit",
                      month: "short",
                    }) ?? "Data a definir"}
                  </span>
                </div>

                <dl className="mt-5 grid gap-3 text-sm">
                  <div className="flex gap-3">
                    <Users size={16} className="mt-0.5 shrink-0 text-gold" aria-hidden="true" />
                    <div>
                      <dt className="text-[10px] uppercase tracking-[0.1em] text-forest/40">Passageiro</dt>
                      <dd className="mt-0.5 font-medium text-ink">{nextService.reservation.client.name}</dd>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <MapPin size={16} className="mt-0.5 shrink-0 text-gold" aria-hidden="true" />
                    <div>
                      <dt className="text-[10px] uppercase tracking-[0.1em] text-forest/40">Rota</dt>
                      <dd className="mt-0.5 leading-5 text-ink/82">
                        {nextService.pickup_location ?? "Origem não informada"} → {nextService.dropoff_location ?? "Destino não informado"}
                      </dd>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Route size={16} className="mt-0.5 shrink-0 text-gold" aria-hidden="true" />
                    <div>
                      <dt className="text-[10px] uppercase tracking-[0.1em] text-forest/40">Reserva e veículo</dt>
                      <dd className="mt-0.5 text-ink/82">
                        {nextService.reservation.code} · {nextService.vehicle ? nextService.vehicle.model + " · " + nextService.vehicle.plate : "Veículo a definir"}
                      </dd>
                    </div>
                  </div>
                </dl>
              </div>

              <div className="flex flex-col gap-2 lg:min-w-44">
                <ServiceExecutionActions serviceId={nextService.id} executionStatus={nextService.execution_status} />
                {(nextService.pickup_location || nextService.dropoff_location) && (
                  <a
                    href={routeUrl(nextService.pickup_location, nextService.dropoff_location)}
                    target="_blank"
                    rel="noreferrer"
                    className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-forest/16 bg-white px-4 text-sm font-medium text-forest transition hover:bg-forest/[0.035]"
                  >
                    <Navigation size={15} aria-hidden="true" />
                    Abrir rota
                  </a>
                )}
                <a
                  href={"/api/documentos/os/" + nextService.id}
                  target="_blank"
                  rel="noreferrer"
                  className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-forest/16 bg-white px-4 text-sm font-medium text-forest transition hover:bg-forest/[0.035]"
                >
                  <FileText size={15} aria-hidden="true" />
                  Ordem de serviço
                </a>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2 border-t border-forest/10 pt-4">
              <div className="rounded-lg bg-forest/[0.045] p-3">
                <p className="text-[10px] uppercase tracking-[0.1em] text-forest/40">Passageiros</p>
                <p className="mt-1 text-sm font-semibold text-forest">{nextService.passenger_count ?? "—"}</p>
              </div>
              <div className="rounded-lg bg-forest/[0.045] p-3">
                <p className="text-[10px] uppercase tracking-[0.1em] text-forest/40">Voo</p>
                <p className="mt-1 text-sm font-semibold text-forest">{nextService.flight_number ?? "Não informado"}</p>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="surface-panel px-5 py-14 text-center">
          <CalendarDays size={32} className="mx-auto text-forest/22" aria-hidden="true" />
          <h2 className="mt-3 text-sm font-semibold text-forest">Nenhum serviço agendado</h2>
          <p className="mt-1 text-xs text-forest/46">Sua agenda está livre no momento.</p>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.6fr)]">
        <section className="surface-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-forest/10 px-5 py-4">
            <div>
              <h2 className="section-heading">Hoje</h2>
              <p className="mt-1 text-xs text-forest/46">{todayServices.length} serviços na agenda.</p>
            </div>
            <Link href="/portal/motorista/servicos" className="focus-ring inline-flex items-center gap-1 rounded text-xs font-semibold text-forest">
              Agenda completa
              <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </div>
          {todayServices.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-forest/46">Nenhum outro serviço hoje.</p>
          ) : (
            <ul className="divide-y divide-forest/[0.075]">
              {todayServices.map((service) => (
                <li key={service.id}>
                  <Link href={"/portal/motorista/servicos#" + service.id} className="group flex items-center gap-3 px-5 py-4 hover:bg-forest/[0.025]">
                    <span className="flex min-w-14 items-center gap-1 text-sm font-semibold text-forest">
                      <Clock3 size={13} className="text-gold" aria-hidden="true" />
                      {service.scheduled_time ?? "—"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-xs text-ink">{service.reservation.client.name}</strong>
                      <span className="mt-1 block truncate text-[11px] text-forest/45">
                          {service.pickup_location ?? "Origem a definir"} → {service.dropoff_location ?? "Destino a definir"}
                      </span>
                    </span>
                    <ArrowRight size={14} className="text-forest/30 group-hover:text-forest" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface-panel p-5">
          <h2 className="section-heading">Ações rápidas</h2>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link href="/portal/motorista/servicos" className="focus-ring flex min-h-20 flex-col items-center justify-center gap-2 rounded-lg border border-forest/10 bg-[#faf9f6] text-center text-[11px] font-medium text-forest hover:bg-forest/[0.055]">
              <CalendarDays size={18} aria-hidden="true" />
              Abrir agenda
            </Link>
            <Link href="/portal/motorista/despesas" className="focus-ring flex min-h-20 flex-col items-center justify-center gap-2 rounded-lg border border-forest/10 bg-[#faf9f6] text-center text-[11px] font-medium text-forest hover:bg-forest/[0.055]">
              <ReceiptText size={18} aria-hidden="true" />
              Registrar despesa
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
