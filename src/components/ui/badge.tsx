type BadgeTone = "success" | "danger" | "warning" | "info" | "neutral" | "gold";

const TONE_CLASSES: Record<BadgeTone, string> = {
  success: "bg-success-light text-success",
  danger: "bg-danger-light text-danger",
  warning: "bg-warning-light text-warning",
  info: "bg-info-light text-info",
  neutral: "bg-gray-100 text-ink-500",
  gold: "bg-gold-100 text-gold-700",
};

type BadgeProps = {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
};

// Badge de status — pílula colorida com texto, pra reconhecer o estado de
// algo (reserva, lançamento, solicitação) sem precisar ler a célula
// inteira. Tom semântico, nunca decorativo: success = concluído/receita,
// danger = problema/despesa, warning = atenção/pendente, info = neutro
// mas informativo, gold = destaque da marca, neutral = default/arquivado.
export function Badge({ tone = "neutral", children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-[3px] px-[9px] py-[3px] text-[11px] font-semibold ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
