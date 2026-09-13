import { formatCurrency } from "@/lib/documents/format";

type FinanceListProps = {
  aReceberHoje: number;
  aPagarHoje: number;
  saldoContas: number;
};

export function FinanceList({ aReceberHoje, aPagarHoje, saldoContas }: FinanceListProps) {
  return (
    <div className="py-1">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <span className="text-[13px] font-medium text-ink-500">A receber hoje</span>
        <span className="text-[17px] font-bold text-moss-500">{formatCurrency(aReceberHoje)}</span>
      </div>
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <span className="text-[13px] font-medium text-ink-500">A pagar hoje</span>
        <span className="text-[17px] font-bold text-brick-500">{formatCurrency(aPagarHoje)}</span>
      </div>
      <div className="flex items-center justify-between px-5 py-3.5">
        <span className="text-[13px] font-medium text-ink-500">Saldo em contas</span>
        <span className="text-[17px] font-bold text-ink-900">{formatCurrency(saldoContas)}</span>
      </div>
    </div>
  );
}
