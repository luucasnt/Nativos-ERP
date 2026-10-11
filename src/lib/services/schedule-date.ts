import { bahiaDate } from "@/lib/finance/payment-date";

// scheduled_date guarda um dia de calendário (YYYY-MM-DD), separado do
// horário do serviço. O dia atual vem do relógio da Bahia; os limites para
// consultar esse campo ficam em UTC, como as datas gravadas pelos formulários.
// Não usar estes limites para pagamentos ou outros eventos com hora real.
export function serviceDayRange(now = new Date()) {
  const date = bahiaDate(now);
  const start = new Date(`${date}T00:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  const weekEnd = new Date(start);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 8);
  return { now, date, start, end, weekEnd };
}

export function serviceDateKey(date: Date | null) {
  return date?.toISOString().slice(0, 10) ?? "";
}
