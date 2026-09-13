type WeekChartProps = {
  days: { label: string; count: number; isToday: boolean }[];
};

export function WeekChart({ days }: WeekChartProps) {
  const max = Math.max(1, ...days.map((d) => d.count));

  return (
    <div className="flex gap-3 p-5">
      {days.map((day, index) => {
        const heightPercent = day.count === 0 ? 4 : Math.max(8, Math.round((day.count / max) * 100));
        return (
          <div key={index} className="flex flex-1 flex-col items-center gap-2">
            {/* Altura fixa no container do bar: porcentagem só resolve
                contra um pai com altura explícita, não "auto". */}
            <div className="flex h-[70px] w-full items-end">
              <div
                className={`w-full rounded-t-[2px] border-t-2 ${
                  day.isToday ? "border-t-forest-900 bg-gold-700" : "border-t-gold-700 bg-gold-100"
                }`}
                style={{ height: `${heightPercent}%` }}
                title={`${day.count} reserva(s)`}
              />
            </div>
            <span className="text-[11px] font-medium text-ink-500">{day.label}</span>
          </div>
        );
      })}
    </div>
  );
}
