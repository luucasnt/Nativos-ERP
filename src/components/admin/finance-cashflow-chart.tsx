"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type CashflowPoint = {
  label: string;
  receitas: number;
  despesas: number;
  resultado: number;
};

const compactMoney = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function FinanceCashflowChart({ data }: { data: CashflowPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-forest/45">
        Nenhum lançamento no período selecionado.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#ece9e2" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#71807b", fontSize: 10 }}
            minTickGap={24}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#71807b", fontSize: 10 }}
            tickFormatter={(value) => compactMoney.format(Number(value))}
            width={58}
          />
          <Tooltip
            formatter={(value, name) => [money.format(Number(value)), String(name)]}
            contentStyle={{
              border: "1px solid #e4e2dc",
              borderRadius: 8,
              boxShadow: "0 10px 30px rgba(23,41,35,.10)",
              fontSize: 12,
            }}
          />
          <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, color: "#65716d" }} />
          <Bar dataKey="receitas" name="Receitas" fill="#355f52" radius={[3, 3, 0, 0]} maxBarSize={22} />
          <Bar dataKey="despesas" name="Despesas" fill="#d9a2a0" radius={[3, 3, 0, 0]} maxBarSize={22} />
          <Line
            type="monotone"
            dataKey="resultado"
            name="Resultado"
            stroke="#b99a66"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

