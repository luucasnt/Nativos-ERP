import { Badge } from "@/components/ui/badge";
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

function statusTone(status: string): "success" | "danger" | "warning" | "info" | "neutral" {
  if (["aprovada", "concluida", "pago"].includes(status)) return "success";
  if (status === "rejeitada") return "danger";
  if (status === "em_analise" || status === "comprovante_em_analise") return "info";
  if (status === "solicitada" || status === "aguardando_comprovante") return "warning";
  return "neutral";
}
function requestTypeLabel(type: string) {
  return type
    .replaceAll("_", " ")
    .replace(/^./, (first) => first.toLocaleUpperCase("pt-BR"));
}

export function ChangeRequestsTable({ requests }: { requests: ChangeRequestRow[] }) {
  if (requests.length === 0) {
    return <p className="py-10 text-center text-sm text-forest/46">Nenhuma solicitação enviada ainda.</p>;
  }

  const now = new Date();

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr>
            <th className="bg-[#faf9f6] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Protocolo</th>
            <th className="bg-[#faf9f6] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Tipo</th>
            <th className="bg-[#faf9f6] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Enviada em</th>
            <th className="bg-[#faf9f6] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Status</th>
            <th className="bg-[#faf9f6] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Resposta</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => {
            const overdue = isChangeRequestOverdue({
              createdAt: request.created_at,
              category: request.category,
              status: request.status as never,
              now,
            });
            return (
              <tr key={request.id} className="border-t border-forest/[0.075] hover:bg-forest/[0.022]">
                <td className="px-4 py-3.5 text-xs font-semibold text-forest">{request.protocol}</td>
                <td className="px-4 py-3.5 text-xs text-ink/75">{requestTypeLabel(request.type)}</td>
                <td className="px-4 py-3.5 text-xs text-forest/48">
                  {request.created_at.toLocaleDateString("pt-BR", { timeZone: "America/Bahia" })}
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <Badge tone={statusTone(request.status)}>{STATUS_LABEL[request.status] ?? request.status}</Badge>
                    {overdue && <Badge tone="danger">Fora do prazo</Badge>}
                  </div>
                </td>
                <td className="max-w-[340px] px-4 py-3.5 text-xs leading-5 text-forest/58">
                  {request.response_note ?? "Aguardando atualização."}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
