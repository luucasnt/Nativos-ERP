import type { LucideIcon } from "lucide-react";
import { Sparkline } from "@/components/ui/sparkline";

type Trend = {
  direction: "up" | "down" | "flat";
  label: string;
  tone?: "positive" | "negative" | "neutral";
};

type MetricCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  trend?: Trend;
  sparkline?: number[];
  accent?: "forest" | "gold" | "success" | "danger" | "warning" | "info";
};

const ACCENT_CLASSES: Record<NonNullable<MetricCardProps["accent"]>, string> = {
  forest: "bg-forest/[0.07] text-forest",
  gold: "bg-gold/15 text-[#8b6a35]",
  success: "bg-success-light text-success",
  danger: "bg-danger-light text-danger",
  warning: "bg-warning-light text-warning",
  info: "bg-info-light text-info",
};

const TREND_TONE_CLASSES: Record<NonNullable<Trend["tone"]>, string> = {
  positive: "text-success",
  negative: "text-danger",
  neutral: "text-forest/45",
};

export function MetricCard({
  icon: Icon,
  label,
  value,
  trend,
  sparkline,
  accent = "forest",
}: MetricCardProps) {
  return (
    <article className="surface-panel min-w-0 p-4">
      <div className="flex items-start justify-between gap-3">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${ACCENT_CLASSES[accent]}`}>
          <Icon size={16} strokeWidth={1.9} aria-hidden="true" />
        </span>
        {sparkline && sparkline.length > 1 && (
          <Sparkline
            data={sparkline}
            color={`var(--color-${accent === "forest" ? "forest" : accent})`}
          />
        )}
      </div>
      <p className="mt-3 truncate text-xs font-medium text-forest/52">{label}</p>
      <p className="mt-0.5 text-[26px] font-semibold leading-tight tracking-[-0.035em] text-forest">{value}</p>
      {trend && (
        <p className={`mt-2 truncate text-[11px] font-medium ${TREND_TONE_CLASSES[trend.tone ?? "neutral"]}`}>
          {trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "•"} {trend.label}
        </p>
      )}
    </article>
  );
}
