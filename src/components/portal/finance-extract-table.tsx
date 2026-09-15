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
  compensacao: {
    amount: { toString(): string };
    status: string;
    reversed_at: Date | null;
  } | null;
  payments: Array<{ amount: { toString(): string } }>;
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

function amounts(entry: ExtractEntry) {
  const original = Number(entry.amount);
  const paid = entry.payments.reduce((total, payment) => total + Number(payment.amount), 0);
  const compensated =
    entry.compensacao?.status === "confirmada" && !entry.compensacao.reversed_at
      ? Math.min(original, Number(entry.compensacao.amount))
      : 0;
  return { original, paid, compensated, balance: Math.max(0, original - paid - compensated) };
}

export function FinanceExtractTable({ entries }: { entries: ExtractEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-forest/58">
        Nenhum lançamento no momento.
      </p>
    );
  }

  return (
    <>
      <ul className="divide-y divide-forest/[0.075] xl:hidden">
        {entries.map((entry) => {
          const { original, paid, compensated, balance } = amounts(entry);
          const hasSettlement = paid > 0 || compensated > 0;
          return (
            <li key={entry.id} className="py-4 first:pt-0 last:pb-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">
                  {FINANCE_ENTRY_CATEGORY_LABEL[entry.category] ??
                    entry.category}
                </p>
                <p className="mt-1 text-[11px] text-forest/55">
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
              <span className="text-[11px] uppercase tracking-[0.08em] text-forest/55">
                {hasSettlement ? "Saldo" : FINANCE_ENTRY_TYPE_LABEL[entry.type] ?? entry.type}
              </span>
              <strong
                className={
                  "text-base " +
                  (entry.type === "receita" ? "text-danger" : "text-success")
                }
              >
                {money.format(hasSettlement ? balance : original)}
              </strong>
            </div>
            {hasSettlement && (
              <p className="mt-2 text-[11px] text-forest/58">
                Original {money.format(original)}
                {paid > 0 ? ` · pago ${money.format(paid)}` : ""}
                {compensated > 0 ? ` · compensado ${money.format(compensated)}` : ""}
              </p>
            )}
            </li>
          );
        })}
      </ul>

      <div className="hidden overflow-x-auto xl:block">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr>
              <th className="bg-[#faf9f6] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-forest/55">
                Data
              </th>
              <th className="bg-[#faf9f6] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-forest/55">
                Descrição
              </th>
              <th className="bg-[#faf9f6] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-forest/55">
                Reserva
              </th>
              <th className="bg-[#faf9f6] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-forest/55">
                Valor
              </th>
              <th className="bg-[#faf9f6] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-forest/55">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const { original, paid, compensated, balance } = amounts(entry);
              const hasSettlement = paid > 0 || compensated > 0;
              return (
              <tr
                key={entry.id}
                className="border-t border-forest/[0.075] hover:bg-forest/[0.022]"
              >
                <td className="px-4 py-3.5 text-xs text-forest/60">
                  {entry.created_at.toLocaleDateString("pt-BR", {
                    timeZone: "America/Bahia",
                  })}
                </td>
                <td className="px-4 py-3.5">
                  <p className="text-xs font-medium text-ink">
                    {FINANCE_ENTRY_CATEGORY_LABEL[entry.category] ??
                      entry.category}
                  </p>
                  <p className="mt-1 text-[11px] text-forest/55">
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
                  {money.format(hasSettlement ? balance : original)}
                  {hasSettlement && (
                    <span className="mt-1 block text-[11px] font-normal text-forest/55">
                      Original {money.format(original)}
                      {paid > 0 ? ` · pago ${money.format(paid)}` : ""}
                      {compensated > 0 ? ` · compensado ${money.format(compensated)}` : ""}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  <Badge tone={statusTone(entry.status)}>
                    {FINANCE_ENTRY_STATUS_LABEL[entry.status] ?? entry.status}
                  </Badge>
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
