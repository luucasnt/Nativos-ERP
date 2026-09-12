import { tableClass, tdClass, thClass } from "@/lib/ui";
import { isChangeRequestOverdue } from "@/lib/change-requests/sla";

type ChangeRequestRow = {
  id: string;
  protocol: string;
  type: string;
  category: "operacional" | "financeiro";
  status: string;
  created_at: Date;
  response_note: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  solicitada: "Solicitada",
  em_analise: "Em análise",
  aprovada: "Aprovada",
  rejeitada: "Rejeitada",
  concluida: "Concluída",
  aguardando_comprovante: "Aguardando comprovante",
  comprovante_em_analise: "Comprovante em análise",
  pago: "Paga",
};

export function ChangeRequestsTable({ requests }: { requests: ChangeRequestRow[] }) {
  if (requests.length === 0) {
    return <p className="text-sm text-forest/60">Nenhuma solicitação enviada ainda.</p>;
  }

  const now = new Date();

  return (
    <table className={tableClass}>
      <thead>
        <tr>
          <th className={thClass}>Protocolo</th>
          <th className={thClass}>Tipo</th>
          <th className={thClass}>Status</th>
          <th className={thClass}>Resposta</th>
        </tr>
      </thead>
      <tbody>
        {requests.map((r) => {
          const overdue = isChangeRequestOverdue({
            createdAt: r.created_at,
            category: r.category,
            status: r.status as never,
            now,
          });
          return (
            <tr key={r.id}>
              <td className={tdClass}>{r.protocol}</td>
              <td className={tdClass}>{r.type}</td>
              <td className={tdClass}>
                {STATUS_LABEL[r.status] ?? r.status}
                {overdue && (
                  <span className="ml-2 rounded-sm bg-red-100 px-1.5 py-0.5 text-xs text-red-700">
                    fora do prazo
                  </span>
                )}
              </td>
              <td className={tdClass}>{r.response_note ?? "—"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
