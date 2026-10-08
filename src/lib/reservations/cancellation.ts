import { terminateReservation } from "@/lib/reservations/termination";
export async function cancelReservation(reservationId: string) {
  return terminateReservation(reservationId, "cancelado");
}
