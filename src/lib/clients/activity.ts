import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ClientActivity = { reservations: number; services: number; completedReservations: number; completedServices: number };
export const EMPTY_CLIENT_ACTIVITY: ClientActivity = { reservations: 0, services: 0, completedReservations: 0, completedServices: 0 };

// Calculate from the actual history instead of maintaining counters that can
// drift when a reservation/service is created, reassigned, cancelled or deleted.
export async function getClientActivity(clientIds: string[]): Promise<Map<string, ClientActivity>> {
  const ids = [...new Set(clientIds)];
  const activity = new Map(ids.map((id) => [id, { ...EMPTY_CLIENT_ACTIVITY }]));
  if (!ids.length) return activity;
  const rows = await prisma.$queryRaw<Array<{ client_id: string; reservations: bigint; services: bigint; completed_reservations: bigint; completed_services: bigint }>>(Prisma.sql`
    SELECT r.client_id,
      COUNT(DISTINCT r.id) AS reservations,
      COUNT(s.id) AS services,
      COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'concluido') AS completed_reservations,
      COUNT(s.id) FILTER (WHERE s.execution_status = 'concluido' AND r.status NOT IN ('cancelado', 'rejeitado')) AS completed_services
    FROM reservations r
    LEFT JOIN services s ON s.reservation_id = r.id
    WHERE r.client_id IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))})
    GROUP BY r.client_id
  `);
  for (const row of rows) activity.set(row.client_id, {
    reservations: Number(row.reservations), services: Number(row.services),
    completedReservations: Number(row.completed_reservations), completedServices: Number(row.completed_services),
  });
  return activity;
}
