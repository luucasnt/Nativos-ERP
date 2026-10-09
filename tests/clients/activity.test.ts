import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getClientActivity, EMPTY_CLIENT_ACTIVITY } from "@/lib/clients/activity";

it("cliente novo começa sem histórico e sem VIP", async () => {
  const c = await prisma.client.create({ data: { name: "Novo cliente" } });
  expect(c.is_vip).toBe(false);
  expect((await getClientActivity([c.id])).get(c.id)).toEqual(EMPTY_CLIENT_ACTIVITY);
  expect((await getClientActivity([])).size).toBe(0);
});
describe("histórico automático do cliente", () => {
  it("conta reservas sem duplicar pelo número de serviços e separa concluídos", async () => {
    const c = await prisma.client.create({ data: { name: "Cliente VIP", is_vip: true } });
    const other = await prisma.client.create({ data: { name: "Outro cliente" } });
    const createReservation = (status: "rascunho" | "pendente" | "concluido" | "cancelado") => prisma.reservation.create({ data: { code: crypto.randomUUID(), client_id: c.id, status } });
    const done = await createReservation("concluido"); const partial = await createReservation("pendente"); const cancelled = await createReservation("cancelado"); const empty = await createReservation("rascunho");
    for (const [reservation, statuses] of [[done, ["concluido", "concluido"]], [partial, ["agendado", "cancelado", "concluido"]], [cancelled, ["concluido"]]] as const) {
      for (const status of statuses) await prisma.service.create({ data: { reservation_id: reservation.id, type: "transfer_chegada", execution_type: "propria", execution_status: status, original_price: 100, price: 100 } });
    }
    const counts = (await getClientActivity([c.id, other.id, c.id])).get(c.id);
    expect(counts).toEqual({ reservations: 4, services: 6, completedReservations: 1, completedServices: 3 });
    await prisma.client.update({ where: { id: c.id }, data: { is_vip: false } });
    expect((await getClientActivity([c.id])).get(c.id)).toEqual(counts);
    await prisma.reservation.update({ where: { id: partial.id }, data: { client_id: other.id } });
    const updated = await getClientActivity([c.id, other.id]);
    expect(updated.get(c.id)).toEqual({ reservations: 3, services: 3, completedReservations: 1, completedServices: 2 });
    expect(updated.get(other.id)).toEqual({ reservations: 1, services: 3, completedReservations: 0, completedServices: 1 });
    await prisma.reservation.delete({ where: { id: empty.id } });
    expect((await getClientActivity([c.id])).get(c.id)?.reservations).toBe(2);
  });
});
