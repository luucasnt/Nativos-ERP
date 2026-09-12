import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buttonClass, linkClass, tableClass, tdClass, thClass } from "@/lib/ui";
import { RESERVATION_STATUS_LABEL } from "@/lib/reservations/status-labels";

export default async function ReservasPage() {
  const reservations = await prisma.reservation.findMany({
    orderBy: { created_at: "desc" },
    include: { client: true, _count: { select: { services: true } } },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-3xl text-forest">Reservas</h1>
        <Link href="/admin/reservas/novo" className={buttonClass}>
          Nova reserva
        </Link>
      </div>

      {reservations.length === 0 ? (
        <p className="text-forest/60">Nenhuma reserva cadastrada ainda.</p>
      ) : (
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={thClass}>Código</th>
              <th className={thClass}>Cliente</th>
              <th className={thClass}>Serviços</th>
              <th className={thClass}>Status</th>
              <th className={thClass}></th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((r) => (
              <tr key={r.id}>
                <td className={tdClass}>{r.code}</td>
                <td className={tdClass}>{r.client.name}</td>
                <td className={tdClass}>{r._count.services}</td>
                <td className={tdClass}>
                  {RESERVATION_STATUS_LABEL[r.status]}
                  {r.has_partial_cancellation && (
                    <span className="ml-2 rounded-sm bg-gold/20 px-1.5 py-0.5 text-xs text-forest">
                      parcialmente cancelada
                    </span>
                  )}
                </td>
                <td className={tdClass}>
                  <Link href={`/admin/reservas/${r.id}`} className={linkClass}>
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
