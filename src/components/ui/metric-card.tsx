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
  forest: "bg-forest/10 text-forest",
  gold: "bg-gold/20 text-forest",
  success: "bg-success-light text-success",
  danger: "bg-danger-light text-danger",
  warning: "bg-warning-light text-warning",
  info: "bg-info-light text-info",
};

const TREND_TONE_CLASSES: Record<NonNullable<Trend["tone"]>, string> = {
  positive: "text-success",
  negative: "text-danger",
  neutral: "text-forest/50",
};

// Card de métrica padrão Stripe: número grande, ícone num selo colorido,
// variação vs. período anterior quando fizer sentido, sparkline opcional
// ao lado do número. Usado na home operacional do admin e no resumo do
// financeiro.
export function MetricCard({
  icon: Icon,
  label,
  value,
  trend,
  sparkline,
  accent = "forest",
}: MetricCardProps) {
  return (
    <div className="rounded-lg border border-forest/10 bg-white p-5 shadow-sm shadow-forest/5">
      <div className="flex items-start justify-between">
        <span className={`flex h-9 w-9 items-center justify-center rounded-full ${ACCENT_CLASSES[accent]}`}>
          <Icon size={18} strokeWidth={2} aria-hidden="true" />
        </span>
        {sparkline && sparkline.length > 1 && (
          <Sparkline data={sparkline} color={`var(--color-${accent === "forest" ? "forest" : accent})`} />
        )}
      </div>
      <p className="mt-4 text-sm text-forest/60">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-serif text-3xl text-forest">{value}</span>
      </div>
      {trend && (
        <p className={`mt-2 text-xs font-medium ${TREND_TONE_CLASSES[trend.tone ?? "neutral"]}`}>
          {trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "•"} {trend.label}
        </p>
      )}
    </div>
  );
}
