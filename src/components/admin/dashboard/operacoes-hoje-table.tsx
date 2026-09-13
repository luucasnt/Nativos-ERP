import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EXECUTION_STATUS_BADGE } from "@/lib/reservations/execution-status-badge";
import type { ServiceExecutionStatus } from "@prisma/client";

type Row = {
  id: string;
  reservationId: string;
  horario: string;
  cliente: string;
  rota: string;
  responsavel: string;
  status: ServiceExecutionStatus;
};

export function OperacoesHojeTable({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return <p className="px-5 py-6 text-sm text-ink-500">Nenhum serviço programado para hoje.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            {["Horário", "Cliente", "Rota", "Motorista", "Status"].map((head) => (
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
          {rows.map((row) => {
            const badge = EXECUTION_STATUS_BADGE[row.status];
            return (
              <tr key={row.id}>
                <td className="border-b border-border px-5 py-3">{row.horario}</td>
                <td className="border-b border-border px-5 py-3">
                  <Link href={`/admin/reservas/${row.reservationId}`} className="hover:underline">
                    {row.cliente}
                  </Link>
                </td>
                <td className="border-b border-border px-5 py-3">{row.rota}</td>
                <td className="border-b border-border px-5 py-3">{row.responsavel}</td>
                <td className="border-b border-border px-5 py-3">
                  <Badge tone={badge.tone}>{badge.label}</Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
