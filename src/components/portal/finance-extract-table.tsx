import { Badge } from "@/components/ui/badge";
import {
  FINANCE_ENTRY_CATEGORY_LABEL,
  FINANCE_ENTRY_STATUS_LABEL,
  FINANCE_ENTRY_TYPE_LABEL,
} from "@/lib/finance/labels";

type ExtractEntry = {
  id: string;
  type: string;
  category: string;
  status: string;
  amount: { toString(): string };
  created_at: Date;
  reservation: { id: string; code: string } | null;
};

function statusTone(
  status: string,
): "success" | "danger" | "warning" | "neutral" {
  if (status === "pago") return "success";
  if (status === "vencido") return "danger";
  if (status === "pendente") return "warning";
  return "neutral";
}
const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function FinanceExtractTable({ entries }: { entries: ExtractEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-forest/46">
        Nenhum lançamento no momento.
      </p>
    );
  }

  return (
    <>
      <ul className="divide-y divide-forest/[0.075] md:hidden">
        {entries.map((entry) => (
          <li key={entry.id} className="py-4 first:pt-0 last:pb-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">
                  {FINANCE_ENTRY_CATEGORY_LABEL[entry.category] ??
                    entry.category}
                </p>
                <p className="mt-1 text-[11px] text-forest/44">
                  {entry.created_at.toLocaleDateString("pt-BR", {
                    timeZone: "America/Bahia",
                  })}
                  {entry.reservation ? " · " + entry.reservation.code : ""}
                </p>
              </div>
              <Badge tone={statusTone(entry.status)}>
                {FINANCE_ENTRY_STATUS_LABEL[entry.status] ?? entry.status}
              </Badge>
            </div>
            <div className="mt-3 flex items-end justify-between rounded-lg bg-[#faf9f6] px-3 py-2.5">
              <span className="text-[10px] uppercase tracking-[0.08em] text-forest/42">
                {FINANCE_ENTRY_TYPE_LABEL[entry.type] ?? entry.type}
              </span>
              <strong
                className={
                  "text-base " +
                  (entry.type === "receita" ? "text-danger" : "text-success")
                }
              >
                {money.format(Number(entry.amount))}
              </strong>
            </div>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr>
              <th className="bg-[#faf9f6] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">
                Data
              </th>
              <th className="bg-[#faf9f6] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">
                Descrição
              </th>
              <th className="bg-[#faf9f6] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">
                Reserva
              </th>
              <th className="bg-[#faf9f6] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">
                Valor
              </th>
              <th className="bg-[#faf9f6] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.id}
                className="border-t border-forest/[0.075] hover:bg-forest/[0.022]"
              >
                <td className="px-4 py-3.5 text-xs text-forest/48">
                  {entry.created_at.toLocaleDateString("pt-BR", {
                    timeZone: "America/Bahia",
                  })}
                </td>
                <td className="px-4 py-3.5">
                  <p className="text-xs font-medium text-ink">
                    {FINANCE_ENTRY_CATEGORY_LABEL[entry.category] ??
                      entry.category}
                  </p>
                  <p className="mt-1 text-[10px] text-forest/42">
                    {FINANCE_ENTRY_TYPE_LABEL[entry.type] ?? entry.type}
                  </p>
                </td>
                <td className="px-4 py-3.5 text-xs font-semibold text-forest">
                  {entry.reservation?.code ?? "—"}
                </td>
                <td
                  className={
                    "px-4 py-3.5 text-xs font-semibold " +
                    (entry.type === "receita" ? "text-danger" : "text-success")
                  }
                >
                  {money.format(Number(entry.amount))}
                </td>
                <td className="px-4 py-3.5">
                  <Badge tone={statusTone(entry.status)}>
                    {FINANCE_ENTRY_STATUS_LABEL[entry.status] ?? entry.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
