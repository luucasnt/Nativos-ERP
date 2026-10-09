import { prisma } from "@/lib/prisma";
import { createReservation } from "../actions";
import { ReservationForm } from "../reservation-form";

export default async function NovaReservaPage() {
  const categories = await prisma.catalogItem.findMany({ where: { type: "tipo_veiculo", active: true }, orderBy: [{ order: "asc" }, { label: "asc" }], select: { id: true, label: true } });
  return (
    <div>
      <h1 className="mb-6 font-serif text-3xl text-forest">Nova reserva</h1>
      <ReservationForm
        action={createReservation}
        categories={categories}
        clients={[]}
        partners={[]}
        companies={[]}
        drivers={[]}
        cancelHref="/admin/reservas"
      />
    </div>
  );
}
