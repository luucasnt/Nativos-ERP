import { prisma } from "@/lib/prisma";
import { tableClass, tdClass, thClass } from "@/lib/ui";
import { ChangeRequestReviewActions } from "@/components/admin/change-request-review-actions";
import { isChangeRequestOverdue } from "@/lib/change-requests/sla";

export default async function SolicitacoesPage() {
  const requests = await prisma.changeRequest.findMany({
    include: { company: true, reservation: true },
    orderBy: { created_at: "asc" },
  });

  const driverIds = requests.filter((r) => r.requester_type === "driver").map((r) => r.requester_id);
  const drivers = await prisma.driver.findMany({
    where: { id: { in: driverIds } },
    select: { id: true, name: true },
  });
  const driverNameById = new Map(drivers.map((d) => [d.id, d.name]));

  const now = new Date();

  return (
    <div>
      <h1 className="mb-2 font-serif text-3xl text-forest">Solicitações dos portais</h1>
      <p className="mb-6 text-forest/60">
        Todo pedido vindo dos 3 portais externos (nova reserva, alteração,
        cancelamento, repasse) passa por aqui, com protocolo e prazo de
        resposta: 30min (operacional) / 2h (financeiro).
      </p>

      {requests.length === 0 ? (
        <p className="text-forest/60">Nenhuma solicitação registrada ainda.</p>
      ) : (
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={thClass}>Protocolo</th>
              <th className={thClass}>Tipo</th>
              <th className={thClass}>Solicitante</th>
              <th className={thClass}>Reserva</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Detalhe</th>
              <th className={thClass}></th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => {
              const overdue = isChangeRequestOverdue({
                createdAt: r.created_at,
                category: r.category,
                status: r.status,
                now,
              });
              const requesterName =
                r.requester_type === "company" ? r.company?.name ?? "—" : driverNameById.get(r.requester_id) ?? "—";
              const detail =
                r.allocation_details && typeof r.allocation_details === "object"
                  ? JSON.stringify(r.allocation_details)
                  : "—";

              return (
                <tr key={r.id}>
                  <td className={tdClass}>{r.protocol}</td>
                  <td className={tdClass}>{r.type}</td>
                  <td className={tdClass}>{requesterName}</td>
                  <td className={tdClass}>{r.reservation?.code ?? "—"}</td>
                  <td className={tdClass}>
                    {r.status}
                    {overdue && (
                      <span className="ml-2 rounded-sm bg-red-100 px-1.5 py-0.5 text-xs text-red-700">
                        fora do prazo
                      </span>
                    )}
                  </td>
                  <td className={`${tdClass} max-w-xs truncate`} title={detail}>
                    {detail}
                  </td>
                  <td className={tdClass}>
                    <ChangeRequestReviewActions id={r.id} currentStatus={r.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
