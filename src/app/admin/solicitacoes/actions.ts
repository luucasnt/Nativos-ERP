"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireInternalUser } from "@/lib/auth/get-current-user";
import { logAudit } from "@/lib/audit";
import { reviewChangeRequest } from "@/lib/change-requests/review";

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

  await reviewChangeRequest({
    id,
    status,
    reviewerId: user.id,
    responseNote,
  });

  await logAudit({
    actorId: user.id,
    action: "solicitacao_revisada",
    entityType: "change_request",
    entityId: id,
    metadata: { status, responseNote },
  });

  revalidatePath("/admin/solicitacoes");
}
