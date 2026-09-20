import { createReservation } from "../actions";
import { ReservationForm } from "../reservation-form";

export default async function NovaReservaPage() {
  return (
    <div>
      <h1 className="mb-6 font-serif text-3xl text-forest">Nova reserva</h1>
      <ReservationForm
        action={createReservation}
        clients={[]}
        partners={[]}
        companies={[]}
        drivers={[]}
        cancelHref="/admin/reservas"
      />
    </div>
  );
}
