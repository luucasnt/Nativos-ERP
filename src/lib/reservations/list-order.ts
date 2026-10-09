type ScheduledService = {
  scheduled_date: Date | null;
  scheduled_time: string | null;
  execution_status: string;
  acceptance_status: string;
};

function compareServices(a: ScheduledService, b: ScheduledService) {
  const dateA = a.scheduled_date?.getTime() ?? Infinity;
  const dateB = b.scheduled_date?.getTime() ?? Infinity;
  if (dateA !== dateB) return dateA < dateB ? -1 : 1;
  return (a.scheduled_time || "99:99").localeCompare(b.scheduled_time || "99:99");
}

// Mantém serviços já concluídos como referência somente quando não há
// outro atendimento ativo. Cancelados e recusados não definem a agenda.
export function reservationScheduleService<T extends ScheduledService>(services: T[]): T | undefined {
  const valid = services.filter(service => service.execution_status !== "cancelado" && service.acceptance_status !== "recusado");
  const pending = valid.filter(service => service.execution_status !== "concluido");
  return [...(pending.length ? pending : valid)].sort(compareServices)[0];
}

export function orderReservationsByService<T extends { id: string; services: ScheduledService[] }>(reservations: T[]): T[] {
  const schedule = new Map(reservations.map(reservation => [reservation.id, reservationScheduleService(reservation.services)]));
  return [...reservations].sort((a, b) => {
    const first = schedule.get(a.id);
    const second = schedule.get(b.id);
    if (!first || !second) {
      const dateFirst = first?.scheduled_date?.getTime() ?? Infinity;
      const dateSecond = second?.scheduled_date?.getTime() ?? Infinity;
      if (dateFirst !== dateSecond) return dateFirst < dateSecond ? -1 : 1;
    } else {
      const result = compareServices(first, second);
      if (result) return result;
    }
    return a.id.localeCompare(b.id);
  });
}
