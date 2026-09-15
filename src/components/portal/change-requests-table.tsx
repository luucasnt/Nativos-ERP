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

function statusTone(
  status: string,
): "success" | "danger" | "warning" | "info" | "neutral" {
  if (["aprovada", "concluida", "pago"].includes(status)) return "success";
  if (status === "rejeitada") return "danger";
  if (status === "em_analise" || status === "comprovante_em_analise")
    return "info";
  if (status === "solicitada" || status === "aguardando_comprovante")
    return "warning";
  return "neutral";
}
function requestTypeLabel(type: string) {
  return type
    .replaceAll("_", " ")
    .replace(/^./, (first) => first.toLocaleUpperCase("pt-BR"));
}

export function ChangeRequestsTable({
  requests,
}: {
  requests: ChangeRequestRow[];
}) {
  if (requests.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-forest/58">
        Nenhuma solicitação enviada ainda.
      </p>
    );
  }

  const now = new Date();

  return (
    <>
      <ul className="divide-y divide-forest/[0.075] xl:hidden">
        {requests.map((request) => {
          const overdue = isChangeRequestOverdue({
            createdAt: request.created_at,
            category: request.category,
            status: request.status as never,
            now,
          });

          return (
            <li key={request.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-forest">
                    {request.protocol}
                  </p>
                  <p className="mt-1 text-xs text-ink/70">
                    {requestTypeLabel(request.type)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Badge tone={statusTone(request.status)}>
                    {STATUS_LABEL[request.status] ?? request.status}
                  </Badge>
                  {overdue && <Badge tone="danger">Fora do prazo</Badge>}
                </div>
              </div>
              <div className="mt-3 rounded-lg bg-[#faf9f6] p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-forest/55">
                  Resposta
                </p>
                <p className="mt-1 text-xs leading-5 text-forest/65">
                  {request.response_note ?? "Aguardando atualização."}
                </p>
              </div>
              <p className="mt-2 text-[11px] text-forest/55">
                Enviada em{" "}
                {request.created_at.toLocaleDateString("pt-BR", {
                  timeZone: "America/Bahia",
                })}
              </p>
            </li>
          );
        })}
      </ul>

      <div className="hidden overflow-x-auto xl:block">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr>
              <th className="bg-[#faf9f6] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-forest/55">
                Protocolo
              </th>
              <th className="bg-[#faf9f6] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-forest/55">
                Tipo
              </th>
              <th className="bg-[#faf9f6] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-forest/55">
                Enviada em
              </th>
              <th className="bg-[#faf9f6] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-forest/55">
                Status
              </th>
              <th className="bg-[#faf9f6] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-forest/55">
                Resposta
              </th>
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
                <tr
                  key={request.id}
                  className="border-t border-forest/[0.075] hover:bg-forest/[0.022]"
                >
                  <td className="px-4 py-3.5 text-xs font-semibold text-forest">
                    {request.protocol}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-ink/75">
                    {requestTypeLabel(request.type)}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-forest/60">
                    {request.created_at.toLocaleDateString("pt-BR", {
                      timeZone: "America/Bahia",
                    })}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <Badge tone={statusTone(request.status)}>
                        {STATUS_LABEL[request.status] ?? request.status}
                      </Badge>
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
    </>
  );
}
