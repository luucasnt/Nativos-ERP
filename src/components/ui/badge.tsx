type BadgeTone = "success" | "danger" | "warning" | "info" | "neutral" | "gold";

const TONE_CLASSES: Record<BadgeTone, string> = {
  success: "border-success/15 bg-success-light text-success",
  danger: "border-danger/15 bg-danger-light text-danger",
  warning: "border-warning/15 bg-warning-light text-warning",
  info: "border-info/15 bg-info-light text-info",
  neutral: "border-forest/10 bg-forest/[0.045] text-forest/65",
  gold: "border-gold/25 bg-gold/12 text-[#7c6034]",
};

type BadgeProps = {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
};

export function Badge({ tone = "neutral", children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
