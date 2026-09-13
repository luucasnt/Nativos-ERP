import { prisma } from "@/lib/prisma";
import { getTotalBankBalance } from "@/lib/finance/bank-balance";
import { SERVICE_TYPE_LABEL } from "@/lib/reservations/service-type-labels";

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

const WEEKDAY_LABEL = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function routeLabel(service: {
  type: string;
  pickup_location: string | null;
  dropoff_location: string | null;
}) {
  if (service.type === "disposicao") {
    return SERVICE_TYPE_LABEL[service.type] ?? "Disposição";
  }
  if (service.pickup_location || service.dropoff_location) {
    return `${service.pickup_location ?? "—"} → ${service.dropoff_location ?? "—"}`;
  }
  return SERVICE_TYPE_LABEL[service.type] ?? service.type;
}

// Carrega tudo que a home operacional do admin precisa, num único lugar —
// mantém a página em si só de renderização. Definições assumidas
// (INFERIDO, a spec não define esses agregados):
// - "reservas hoje/ontem" = reservas distintas com pelo menos um serviço
//   agendado no dia (não conta reserva por reserva, conta por serviço).
// - "faturamento do dia" = soma de FinanceEntry tipo receita, não
//   cancelado, criado no dia (proxy de "gerado hoje", não "recebido
//   hoje" — isso já é "a receber").
// - "a receber/a pagar hoje" = FinanceEntry ainda não pago/cancelado com
//   due_date hoje.
export async function loadAdminDashboardData() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = addDays(todayStart, 1);
  const yesterdayStart = addDays(todayStart, -1);

  const [
    reservasHojeIds,
    reservasOntemIds,
    emAndamentoAgora,
    faturamentoHojeAgg,
    alertasCriticos,
    operacoesHoje,
    aReceberHojeAgg,
    aPagarHojeAgg,
    saldoContas,
    alertas,
    solicitacoes,
  ] = await Promise.all([
    prisma.service.findMany({
      where: { scheduled_date: { gte: todayStart, lt: todayEnd } },
      distinct: ["reservation_id"],
      select: { reservation_id: true },
    }),
    prisma.service.findMany({
      where: { scheduled_date: { gte: yesterdayStart, lt: todayStart } },
      distinct: ["reservation_id"],
      select: { reservation_id: true },
    }),
    prisma.service.count({ where: { execution_status: "em_andamento" } }),
    prisma.financeEntry.aggregate({
      where: { type: "receita", status: { not: "cancelado" }, created_at: { gte: todayStart, lt: todayEnd } },
      _sum: { amount: true },
    }),
    prisma.alert.count({ where: { severity: "critico", archived: false } }),
    prisma.service.findMany({
      where: { scheduled_date: { gte: todayStart, lt: todayEnd } },
      include: {
        reservation: { include: { client: true } },
        driver: true,
        supplier: true,
      },
      orderBy: { scheduled_time: "asc" },
    }),
    prisma.financeEntry.aggregate({
      where: {
        type: "receita",
        status: { in: ["pendente", "programado"] },
        due_date: { gte: todayStart, lt: todayEnd },
      },
      _sum: { amount: true },
    }),
    prisma.financeEntry.aggregate({
      where: {
        type: "despesa",
        status: { in: ["pendente", "programado"] },
        due_date: { gte: todayStart, lt: todayEnd },
      },
      _sum: { amount: true },
    }),
    getTotalBankBalance(),
    prisma.alert.findMany({
      where: { archived: false },
      orderBy: [{ severity: "desc" }, { created_at: "desc" }],
      take: 4,
    }),
    prisma.changeRequest.findMany({
      where: { status: { in: ["solicitada", "em_analise"] } },
      orderBy: { created_at: "asc" },
      take: 4,
    }),
  ]);

  const last7Days = await Promise.all(
    Array.from({ length: 7 }).map(async (_, index) => {
      const dayStart = addDays(todayStart, index - 6);
      const dayEnd = addDays(dayStart, 1);
      const services = await prisma.service.findMany({
        where: { scheduled_date: { gte: dayStart, lt: dayEnd } },
        distinct: ["reservation_id"],
        select: { reservation_id: true },
      });
      return {
        date: dayStart,
        label: WEEKDAY_LABEL[dayStart.getDay()],
        count: services.length,
        isToday: index === 6,
      };
    }),
  );

  return {
    kpis: {
      reservasHoje: reservasHojeIds.length,
      reservasHojeDelta: reservasHojeIds.length - reservasOntemIds.length,
      emAndamentoAgora,
      faturamentoHoje: Number(faturamentoHojeAgg._sum.amount ?? 0),
      alertasCriticos,
    },
    operacoesHoje: operacoesHoje.map((service) => ({
      id: service.id,
      reservationId: service.reservation_id,
      horario: service.scheduled_time ?? "—",
      cliente: service.reservation.client.name,
      rota: routeLabel(service),
      responsavel: service.driver?.name ?? service.supplier?.name ?? "—",
      status: service.execution_status,
    })),
    last7Days,
    financeiro: {
      aReceberHoje: Number(aReceberHojeAgg._sum.amount ?? 0),
      aPagarHoje: Number(aPagarHojeAgg._sum.amount ?? 0),
      saldoContas,
    },
    alertas,
    solicitacoes,
  };
}
