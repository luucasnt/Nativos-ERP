type SparklineProps = {
  data: number[];
  color?: string;
};

export function Sparkline({ data, color = "var(--color-forest)" }: SparklineProps) {
  if (data.length === 0) return null;

  const width = 80;
  const height = 40;
  const padding = 3;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = Math.max(max - min, 1);
  const linePoints = data
    .map((value, index) => {
      const x = data.length === 1 ? width / 2 : (index / (data.length - 1)) * width;
      const y = padding + ((max - value) / range) * (height - padding * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const areaPoints = `0,${height} ${linePoints} ${width},${height}`;

  return (
    <svg
      aria-hidden="true"
      className="h-10 w-20 shrink-0"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      <polygon points={areaPoints} fill={color} fillOpacity="0.1" />
      <polyline
        points={linePoints}
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.75"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
