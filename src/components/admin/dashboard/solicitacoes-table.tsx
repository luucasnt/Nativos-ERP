import type { ChangeRequest } from "@prisma/client";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { changeRequestTypeLabel } from "@/lib/change-requests/labels";
import { formatSlaRemaining } from "@/lib/change-requests/sla-badge";

export function SolicitacoesTable({ requests }: { requests: ChangeRequest[] }) {
  if (requests.length === 0) {
    return <p className="px-5 py-6 text-sm text-ink-500">Nenhuma solicitação pendente.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            {["Protocolo", "Tipo", "SLA"].map((head) => (
              <th
                key={head}
                className="border-b border-border bg-gray-50 px-5 py-2.5 text-left text-[11.5px] font-semibold text-ink-500"
              >
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr:last-child>td]:border-b-0">
          {requests.map((request) => {
            const sla = formatSlaRemaining({
              createdAt: request.created_at,
              category: request.category,
              status: request.status,
            });
            return (
              <tr key={request.id}>
                <td className="border-b border-border px-5 py-3">
                  <Link href="/admin/solicitacoes" className="hover:underline">
                    {request.protocol}
                  </Link>
                </td>
                <td className="border-b border-border px-5 py-3">
                  {changeRequestTypeLabel(request.type)}
                </td>
                <td className="border-b border-border px-5 py-3">
                  <Badge tone={sla.tone}>{sla.label}</Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
