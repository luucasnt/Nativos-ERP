import { prisma } from "@/lib/prisma";
import { createReservation } from "../actions";
import { ReservationForm } from "../reservation-form";

export default async function NovaReservaPage() {
  const [clients, partners, companies, drivers] = await Promise.all([
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.company.findMany({
      where: { roles: { has: "parceiro" } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.company.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.driver.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <h1 className="mb-6 font-serif text-3xl text-forest">Nova reserva</h1>
      <ReservationForm
        action={createReservation}
        clients={clients}
        partners={partners}
        companies={companies}
        drivers={drivers}
        cancelHref="/admin/reservas"
      />
    </div>
  );
}
