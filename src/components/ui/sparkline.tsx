"use client";

import { useId } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

type SparklineProps = {
  data: number[];
  color?: string;
};

// Mini gráfico de tendência ao lado de um número grande de card de
// métrica (padrão Stripe) — não tem eixo, legenda nem tooltip, é só uma
// pista visual de "subindo/descendo/estável" nos últimos períodos.
export function Sparkline({ data, color = "var(--color-forest)" }: SparklineProps) {
  const gradientId = `sparkline-fill-${useId().replace(/:/g, "")}`;
  const points = data.map((value, index) => ({ value, index }));

  return (
    <div className="h-10 w-20 shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.75}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
