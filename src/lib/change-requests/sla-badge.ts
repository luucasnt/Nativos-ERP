import type { ChangeRequestCategory, ChangeRequestStatus } from "@prisma/client";
import { computeChangeRequestDeadline, isChangeRequestOverdue } from "@/lib/change-requests/sla";

// Formata o prazo restante e escolhe o tom do badge — usado no painel
// "Solicitações pendentes" da home do admin. Só faz sentido pra
// solicitações ainda abertas (solicitada/em_analise); chamado sempre
// nesse contexto.
export function formatSlaRemaining(params: {
  createdAt: Date;
  category: ChangeRequestCategory;
  status: ChangeRequestStatus;
  now?: Date;
}) {
  const now = params.now ?? new Date();
  const overdue = isChangeRequestOverdue({ ...params, now });
  const deadline = computeChangeRequestDeadline(params.createdAt, params.category);
  const diffMs = deadline.getTime() - now.getTime();
  const diffMin = Math.round(Math.abs(diffMs) / 60_000);

  if (overdue) {
    return { label: "Atrasada", tone: "danger" as const };
  }

  const label =
    diffMin < 60 ? `${diffMin}min` : `${Math.floor(diffMin / 60)}h ${diffMin % 60}min`;

  return { label, tone: diffMin <= 30 ? ("warning" as const) : ("neutral" as const) };
}
