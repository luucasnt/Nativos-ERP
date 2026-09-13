import type { ServiceExecutionStatus } from "@prisma/client";

export const EXECUTION_STATUS_BADGE: Record<
  ServiceExecutionStatus,
  { label: string; tone: "success" | "warning" | "neutral" | "danger" }
> = {
  agendado: { label: "Agendado", tone: "warning" },
  em_andamento: { label: "Em andamento", tone: "success" },
  concluido: { label: "Concluído", tone: "neutral" },
  cancelado: { label: "Cancelado", tone: "danger" },
};
