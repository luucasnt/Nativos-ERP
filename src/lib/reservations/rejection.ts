// Sem "server-only" — mesma razão de acceptance.ts/status.ts/tax.ts:
// precisa ser importável em testes de integração via Vitest. Mutação
// pura de negócio, sem checagem de autorização — quem chama (a Server
// Action do admin) decide quem pode chamar isto.
import { prisma } from "@/lib/prisma";
import { cancelServiceFinanceEntries } from "@/lib/finance/settlement";

// "Rejeitar reserva inteira" (spec seção 5/6, adiado da Fase 3 para a
// Fase 6): status manual fora do algoritmo automático
// (computeReservationStatus nunca produz "rejeitado" sozinho) — uma vez
// setado aqui, recalculateReservationStatus para de recalcular esta
// reserva (ver src/lib/reservations/status.ts) até uma reversão manual.
// Cancela (nunca apaga) os lançamentos ainda não pagos de cada serviço,
// já que a reserva inteira deixou de valer.
export async function rejectReservationEntirely(reservationId: string, reason: string) {
  if (!reason.trim()) {
    throw new Error("Informe o motivo da rejeição.");
  }

  const services = await prisma.service.findMany({
    where: { reservation_id: reservationId },
    select: { id: true },
  });
  for (const service of services) {
    await cancelServiceFinanceEntries(service.id);
  }

  return prisma.reservation.update({
    where: { id: reservationId },
    data: { status: "rejeitado" },
  });
}
