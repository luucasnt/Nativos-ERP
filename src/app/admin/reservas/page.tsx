import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buttonClass, linkClass, tableClass, tdClass, thClass } from "@/lib/ui";

const statusLabel: Record<string, string> = {
  aguardando_confirmacao: "Aguardando confirmação",
  confirmada: "Confirmada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
  parcialmente_cancelada: "Parcialmente cancelada",
};

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
                <td className={tdClass}>{statusLabel[r.status]}</td>
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
