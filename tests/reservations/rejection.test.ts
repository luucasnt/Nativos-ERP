// Integração real (Postgres): "rejeitar reserva inteira" (spec seção 6,
// adiado da Fase 3 para a Fase 6) — status manual fora do algoritmo
// automático, e recalculateReservationStatus nunca o desfaz sozinho.
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { rejectReservationEntirely } from "@/lib/reservations/rejection";
import { recalculateReservationStatus } from "@/lib/reservations/status";

const prisma = new PrismaClient();

afterAll(async () => {
  await prisma.$disconnect();
});

async function seedReservationWithService() {
  const client = await prisma.client.create({ data: { name: `Cliente Rejeicao ${Date.now()}`, origin: "proprio" } });
  const reservation = await prisma.reservation.create({
    data: { code: `REJ-${Date.now()}`, client_id: client.id, collection_mode: "nativos" },
  });
  const service = await prisma.service.create({
    data: {
      reservation_id: reservation.id,
      type: "transfer_chegada",
      execution_type: "propria",
      original_price: 500,
      price: 500,
      acceptance_status: "aceito",
    },
  });
  return { client, reservation, service };
}

async function cleanup(ids: { clientId: string; reservationId: string; serviceId: string }) {
  await prisma.service.delete({ where: { id: ids.serviceId } }).catch(() => {});
  await prisma.reservation.delete({ where: { id: ids.reservationId } }).catch(() => {});
  await prisma.client.delete({ where: { id: ids.clientId } }).catch(() => {});
}

describe("rejectReservationEntirely", () => {
  it("exige um motivo", async () => {
    const { client, reservation, service } = await seedReservationWithService();
    try {
      await expect(rejectReservationEntirely(reservation.id, "")).rejects.toThrow();
    } finally {
      await cleanup({ clientId: client.id, reservationId: reservation.id, serviceId: service.id });
    }
  });

  it("marca a reserva como rejeitado e cancela os lançamentos do serviço", async () => {
    const { client, reservation, service } = await seedReservationWithService();

    try {
      const { generateServiceFinanceEntries } = await import("@/lib/finance/settlement");
      await generateServiceFinanceEntries(service.id);
      const [entry] = await prisma.financeEntry.findMany({ where: { service_id: service.id } });
      expect(entry.status).toBe("programado");

      await rejectReservationEntirely(reservation.id, "Cliente desistiu");

      const updated = await prisma.reservation.findUniqueOrThrow({ where: { id: reservation.id } });
      expect(updated.status).toBe("rejeitado");

      const cancelledEntry = await prisma.financeEntry.findUniqueOrThrow({ where: { id: entry.id } });
      expect(cancelledEntry.status).toBe("cancelado");
    } finally {
      await cleanup({ clientId: client.id, reservationId: reservation.id, serviceId: service.id });
    }
  });

  it("recalculateReservationStatus não reabre uma reserva rejeitada", async () => {
    const { client, reservation, service } = await seedReservationWithService();

    try {
      await rejectReservationEntirely(reservation.id, "Motivo qualquer");

      const result = await recalculateReservationStatus(reservation.id);
      expect(result.status).toBe("rejeitado");

      const stillRejected = await prisma.reservation.findUniqueOrThrow({ where: { id: reservation.id } });
      expect(stillRejected.status).toBe("rejeitado");
    } finally {
      await cleanup({ clientId: client.id, reservationId: reservation.id, serviceId: service.id });
    }
  });
});
