import { describe, expect, it } from "vitest";
import { orderReservationsByService, reservationScheduleService } from "@/lib/reservations/list-order";
const service = (date: string | null, time: string | null = "10:00", execution_status = "agendado", acceptance_status = "aceito") => ({ scheduled_date: date ? new Date(date + "T00:00:00Z") : null, scheduled_time: time, execution_status, acceptance_status });
describe("agenda da lista de reservas", () => {
  it("ordena por data e horário antes de paginar, independente do cadastro", () => {
    const rows = Array.from({ length: 30 }, (_, i) => ({ id: String(i).padStart(2, "0"), services: [service("2026-10-15", `${String(23 - Math.floor(i / 2)).padStart(2, "0")}:00`)] }));
    rows.push({ id: "last-created", services: [service("2026-10-09", "08:00")] });
    const sorted = orderReservationsByService(rows);
    expect(sorted.slice(0, 25)[0].id).toBe("last-created");
    expect(sorted[1].id).toBe("28");
    expect(sorted.at(-1)?.id).toBe("01");
  });
  it("seleciona o próximo serviço pendente e mantém histórico quando todos concluíram", () => {
    const past = service("2026-10-08", "10:00", "concluido");
    const next = service("2026-10-12", "09:00");
    expect(reservationScheduleService([past, next])).toBe(next);
    expect(reservationScheduleService([past])).toBe(past);
    expect(reservationScheduleService([service("2026-10-01", "10:00", "cancelado"), service("2026-10-02", "10:00", "agendado", "recusado"), next])).toBe(next);
  });
  it("coloca horários indefinidos após horários conhecidos e sem data ao final", () => {
    const sorted = orderReservationsByService([{ id: "empty", services: [] }, { id: "no-date", services: [service(null)] }, { id: "no-time", services: [service("2026-10-09", null)] }, { id: "timed", services: [service("2026-10-09", "12:00")] }]);
    expect(sorted.map(item => item.id)).toEqual(["timed", "no-time", "empty", "no-date"]);
  });
});
