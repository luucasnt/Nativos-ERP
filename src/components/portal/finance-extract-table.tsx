import { tableClass, tdClass, thClass } from "@/lib/ui";
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

export function FinanceExtractTable({ entries }: { entries: ExtractEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-forest/60">Nenhum lançamento no momento.</p>;
  }

  return (
    <table className={tableClass}>
      <thead>
        <tr>
          <th className={thClass}>Data</th>
          <th className={thClass}>Tipo</th>
          <th className={thClass}>Categoria</th>
          <th className={thClass}>Reserva</th>
          <th className={thClass}>Valor</th>
          <th className={thClass}>Status</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.id}>
            <td className={tdClass}>{entry.created_at.toLocaleDateString("pt-BR")}</td>
            <td className={tdClass}>{FINANCE_ENTRY_TYPE_LABEL[entry.type]}</td>
            <td className={tdClass}>{FINANCE_ENTRY_CATEGORY_LABEL[entry.category]}</td>
            <td className={tdClass}>{entry.reservation?.code ?? "—"}</td>
            <td className={tdClass}>
              {Number(entry.amount.toString()).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </td>
            <td className={tdClass}>{FINANCE_ENTRY_STATUS_LABEL[entry.status]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
