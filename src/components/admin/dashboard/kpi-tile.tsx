type KpiTileProps = {
  label: string;
  value: string;
  delta?: string;
  accent?: "forest" | "gold" | "danger" | "moss";
};

const ACCENT_BORDER: Record<NonNullable<KpiTileProps["accent"]>, string> = {
  forest: "border-l-forest-700",
  gold: "border-l-gold-700",
  danger: "border-l-brick-500",
  moss: "border-l-moss-500",
};

export function KpiTile({ label, value, delta, accent = "forest" }: KpiTileProps) {
  return (
    <div
      className={`rounded-[4px] border border-border border-l-[3px] bg-white px-[18px] py-4 ${ACCENT_BORDER[accent]}`}
    >
      <div className="mb-2 text-xs font-medium text-ink-500">{label}</div>
      <div className="text-[26px] font-bold tracking-tight text-ink-900">{value}</div>
      {delta && <div className="mt-1 text-[11.5px] font-semibold text-moss-500">{delta}</div>}
    </div>
  );
}
