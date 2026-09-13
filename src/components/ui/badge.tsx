type BadgeTone = "success" | "danger" | "warning" | "info" | "neutral" | "gold";

const TONE_CLASSES: Record<BadgeTone, string> = {
  success: "bg-success-light text-success",
  danger: "bg-danger-light text-danger",
  warning: "bg-warning-light text-warning",
  info: "bg-info-light text-info",
  neutral: "bg-forest/8 text-forest/70",
  gold: "bg-gold/20 text-forest",
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
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
