import { terminateReservation } from "@/lib/reservations/termination";
export async function rejectReservationEntirely(reservationId: string, reason: string) {
  if (!reason.trim() || reason.trim().length > 1000) throw new Error("Informe um motivo de rejeição de até 1000 caracteres.");
  return terminateReservation(reservationId, "rejeitado");
}
