import type { ClientActivity } from "@/lib/clients/activity";

export function ClientActivitySummary({ activity }: { activity: ClientActivity }) {
  return (
    <section aria-label="Histórico do cliente" className="mb-6 grid max-w-2xl gap-3 sm:grid-cols-2">
      <div className="surface-panel p-4">
        <p className="text-xs font-medium text-forest/65">Reservas cadastradas</p>
        <p className="mt-2 text-2xl font-semibold text-forest">{activity.reservations}</p>
        <p className="mt-1 text-xs text-forest/65">{activity.completedReservations} concluídas</p>
      </div>
      <div className="surface-panel p-4">
        <p className="text-xs font-medium text-forest/65">Serviços cadastrados</p>
        <p className="mt-2 text-2xl font-semibold text-forest">{activity.services}</p>
        <p className="mt-1 text-xs text-forest/65">{activity.completedServices} realizados</p>
      </div>
      <p className="text-xs text-forest/55 sm:col-span-2">Totais incluem o histórico de cadastros. Cancelamentos e rejeições não contam como serviços realizados.</p>
    </section>
  );
}
