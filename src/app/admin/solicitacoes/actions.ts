"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireInternalUser } from "@/lib/auth/get-current-user";
import { logAudit } from "@/lib/audit";
import { reviewChangeRequest } from "@/lib/change-requests/review";
import { prisma } from "@/lib/prisma";
import { cancelReservation } from "@/lib/reservations/cancellation";
import type { ChangeRequestStatus } from "@prisma/client";

const statusSchema = z.enum([
  "solicitada",
  "em_analise",
  "aprovada",
  "rejeitada",
  "concluida",
  "aguardando_comprovante",
  "comprovante_em_analise",
  "pago",
]);

export async function updateChangeRequestStatus(id: string, statusInput: string, responseNote: string) {
  const user = await requireInternalUser();
  const status = statusSchema.parse(statusInput);

  const request = await prisma.changeRequest.findUniqueOrThrow({ where: { id } });
  const transitions: Record<ChangeRequestStatus, ChangeRequestStatus[]> = {
    solicitada: ["em_analise", "aprovada", "rejeitada"],
    em_analise: ["aprovada", "rejeitada"],
    aprovada: ["concluida", "aguardando_comprovante", "pago"],
    rejeitada: [],
    concluida: [],
    aguardando_comprovante: ["comprovante_em_analise", "pago", "rejeitada"],
    comprovante_em_analise: ["pago", "rejeitada", "aguardando_comprovante"],
    pago: ["concluida"],
  };
  if (status !== request.status && !transitions[request.status].includes(status)) {
    throw new Error("Esta mudança de status não é permitida para a etapa atual.");
  }

  // Cancelamento é o único pedido cujo efeito é inequívoco e seguro para
  // automatizar. Alterações textuais continuam exigindo conferência humana.
  if (request.type === "cancelamento" && status === "aprovada") {
    if (!request.reservation_id) throw new Error("A solicitação não está vinculada a uma reserva.");
    await cancelReservation(request.reservation_id);
  }

  await reviewChangeRequest({
    id,
    status,
    reviewerId: user.id,
    responseNote,
  });

  await Promise.allSettled([logAudit({
    actorId: user.id,
    action: "solicitacao_revisada",
    entityType: "change_request",
    entityId: id,
    metadata: { status, responseNote },
  })]);

  revalidatePath("/admin/solicitacoes");
  if (request.reservation_id) revalidatePath(`/admin/reservas/${request.reservation_id}`);
}
