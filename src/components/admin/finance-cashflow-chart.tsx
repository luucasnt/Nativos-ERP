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

  const width = 720;
  const height = 240;
  const margin = { top: 12, right: 12, bottom: 38, left: 58 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const min = Math.min(0, ...data.map((point) => point.resultado));
  const max = Math.max(1, ...data.flatMap((point) => [point.receitas, point.despesas, point.resultado]));
  const range = Math.max(max - min, 1);
  const yFor = (value: number) => margin.top + ((max - value) / range) * chartHeight;
  const baseline = yFor(0);
  const groupWidth = chartWidth / data.length;
  const barWidth = Math.min(18, Math.max(3, groupWidth * 0.28));
  const labelInterval = Math.max(1, Math.ceil(data.length / 6));
  const linePoints = data
    .map((point, index) => {
      const x = margin.left + groupWidth * index + groupWidth / 2;
      return `${x.toFixed(1)},${yFor(point.resultado).toFixed(1)}`;
    })
    .join(" ");

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-forest/55" aria-hidden="true">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#355f52]" />Receitas</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#d9a2a0]" />Despesas</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-3 bg-[#b99a66]" />Resultado</span>
      </div>
      <svg
        role="img"
        aria-label="Gráfico de receitas, despesas e resultado do período"
        className="mt-3 h-44 w-full overflow-visible sm:h-60"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const value = max - range * ratio;
          const y = margin.top + chartHeight * ratio;
          return (
            <g key={ratio}>
              <line x1={margin.left} x2={width - margin.right} y1={y} y2={y} stroke="#ece9e2" strokeDasharray="3 3" />
              <text className="max-sm:hidden" x={margin.left - 7} y={y + 3} textAnchor="end" fill="#71807b" fontSize="9">
                {compactMoney.format(value)}
              </text>
            </g>
          );
        })}

        {data.map((point, index) => {
          const center = margin.left + groupWidth * index + groupWidth / 2;
          const revenueY = yFor(point.receitas);
          const expenseY = yFor(point.despesas);
          return (
            <g key={`${point.label}-${index}`}>
              <rect x={center - barWidth - 1} y={revenueY} width={barWidth} height={Math.max(0, baseline - revenueY)} rx="2" fill="#355f52">
                <title>{`${point.label}: receitas ${money.format(point.receitas)}`}</title>
              </rect>
              <rect x={center + 1} y={expenseY} width={barWidth} height={Math.max(0, baseline - expenseY)} rx="2" fill="#d9a2a0">
                <title>{`${point.label}: despesas ${money.format(point.despesas)}`}</title>
              </rect>
              {(index % labelInterval === 0 || index === data.length - 1) && (
                <text className="max-sm:hidden" x={center} y={height - 12} textAnchor="middle" fill="#71807b" fontSize="9">
                  {point.label}
                </text>
              )}
            </g>
          );
        })}

        <line x1={margin.left} x2={width - margin.right} y1={baseline} y2={baseline} stroke="#d8d6cf" />
        <polyline
          points={linePoints}
          fill="none"
          stroke="#b99a66"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
