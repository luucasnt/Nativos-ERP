import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { acceptService, rejectService } from "@/lib/reservations/acceptance";
import { cancelReservation } from "@/lib/reservations/cancellation";
import { recalculateReservationStatus } from "@/lib/reservations/status";
import { generateServiceFinanceEntries } from "@/lib/finance/settlement";
async function service() { const client = await prisma.client.create({ data: { name: "Teste aceite" } }); const r = await prisma.reservation.create({ data: { client_id: client.id, code: `ACCEPT-${crypto.randomUUID()}` } }); return prisma.service.create({ data: { reservation_id: r.id, type: "transfer_chegada", execution_type: "fornecedor", acceptance_status: "aguardando_aceite", original_price: 100, price: 100 } }); }
describe("respostas preservam ciclo operacional", () => {
  it("aceite repetido é idempotente e resposta já aceita não vira recusa", async () => { const s = await service(); await acceptService(s.id); const count = await prisma.financeEntry.count({ where: { service_id: s.id } }); await acceptService(s.id); expect(await prisma.financeEntry.count({ where: { service_id: s.id } })).toBe(count); await expect(rejectService(s.id, "Desistência")).rejects.toThrow(/reatribuição/); });
  it("cancelamento não pode ser desfeito por aceite, recusa ou recálculo", async () => { const s = await service(); await cancelReservation(s.reservation_id); await expect(acceptService(s.id)).rejects.toThrow(/não pode/); await expect(rejectService(s.id, "Sem carro")).rejects.toThrow(/não pode/); await recalculateReservationStatus(s.reservation_id); await generateServiceFinanceEntries(s.id); expect((await prisma.reservation.findUniqueOrThrow({ where: { id: s.reservation_id } })).status).toBe("cancelado"); expect(await prisma.financeEntry.count({ where: { service_id: s.id } })).toBe(0); });
  it("recusa repetida não reabre serviço; exige motivo", async () => { const s = await service(); await expect(rejectService(s.id, "")).rejects.toThrow(/motivo/); await rejectService(s.id, "Sem carro"); await rejectService(s.id, "Sem carro"); await expect(acceptService(s.id)).rejects.toThrow(/reatribuição/); });
  it("serviço iniciado não aceita resposta retroativa", async () => { const s = await service(); await prisma.service.update({ where: { id: s.id }, data: { execution_status: "em_andamento" } }); await expect(acceptService(s.id)).rejects.toThrow(/não pode/); });
});
