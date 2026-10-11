import { afterAll, describe, expect, it } from "vitest";
import { Prisma, PrismaClient } from "@prisma/client";
import { serviceDateKey, serviceDayRange } from "@/lib/services/schedule-date";
const prisma = new PrismaClient();
afterAll(() => prisma.$disconnect());
describe("dia operacional de calendário na Bahia", () => {
  it("12/10 às 14h é amanhã em 11/10 e não entra na operação de hoje", () => {
    const range = serviceDayRange(new Date("2026-10-11T14:51:00Z"));
    expect(range.date).toBe("2026-10-11");
    expect(range.start.toISOString()).toBe("2026-10-11T00:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-10-12T00:00:00.000Z");
    expect(serviceDateKey(new Date("2026-10-12T00:00:00Z"))).toBe("2026-10-12");
    expect(serviceDateKey(null)).toBe("");
  });
  it.each([
    ["2026-10-12T02:59:59Z", "2026-10-11"],
    ["2026-10-12T03:00:00Z", "2026-10-12"],
    ["2027-01-01T02:59:59Z", "2026-12-31"],
    ["2027-01-01T03:00:00Z", "2027-01-01"],
    ["2026-11-01T02:59:59Z", "2026-10-31"],
  ])("determina hoje pelo relógio da Bahia em %s", (instant, expected) => {
    const { date, start, end, weekEnd } = serviceDayRange(new Date(instant));
    expect(date).toBe(expected); expect(serviceDateKey(start)).toBe(expected);
    expect(end.getTime() - start.getTime()).toBe(86400000);
    expect(weekEnd.getTime() - start.getTime()).toBe(8 * 86400000);
  });
  it("consulta Prisma e contador SQL concordam: hoje inclui só o próprio dia; amanhã entra nos próximos", async () => {
    const client = await prisma.client.create({ data: { name: "Teste dia calendário" } });
    const reservation = await prisma.reservation.create({ data: { code: `DATA-${crypto.randomUUID()}`, client_id: client.id } });
    const ids: string[] = [];
    for (const date of ["2026-10-10", "2026-10-11", "2026-10-12"]) {
      const service = await prisma.service.create({ data: { reservation_id: reservation.id, type: "transfer_saida", execution_type: "propria", scheduled_date: new Date(date), scheduled_time: "14:00", price: 380, original_price: 380 } }); ids.push(service.id);
    }
    const { start, end, weekEnd } = serviceDayRange(new Date("2026-10-11T14:51:00Z"));
    const today = await prisma.service.findMany({ where: { reservation_id: reservation.id, scheduled_date: { gte: start, lt: end } } });
    expect(today.map(s => s.id)).toEqual([ids[1]]);
    const count = await prisma.$queryRaw<{ count: number }[]>(Prisma.sql`select count(*)::integer as count from services where reservation_id = ${reservation.id}::uuid and scheduled_date >= ${start} and scheduled_date < ${end}`);
    expect(count[0].count).toBe(1);
    const upcoming = await prisma.service.findMany({ where: { reservation_id: reservation.id, scheduled_date: { gte: end, lt: weekEnd } } });
    expect(upcoming.map(s => s.id)).toEqual([ids[2]]);
  });
});
