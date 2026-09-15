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
  neutral: "text-forest/58",
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
    <article className="surface-panel relative min-w-0 overflow-hidden p-4 sm:p-[18px]">
      <span className={`absolute inset-x-0 top-0 h-0.5 ${accent === "danger" ? "bg-danger" : accent === "warning" ? "bg-warning" : accent === "success" ? "bg-success" : accent === "info" ? "bg-info" : accent === "gold" ? "bg-gold" : "bg-forest"}`} aria-hidden="true" />
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
      <p className="mt-3 text-[13px] font-medium leading-5 text-forest/62">{label}</p>
      <p className="mt-0.5 break-words text-xl font-semibold leading-tight tracking-[-0.035em] text-forest sm:text-[26px]">{value}</p>
      {trend && (
        <p className={`mt-2 text-xs font-medium leading-4 ${TREND_TONE_CLASSES[trend.tone ?? "neutral"]}`}>
          {trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "•"} {trend.label}
        </p>
      )}
    </article>
  );
}
