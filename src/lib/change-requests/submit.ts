// Criação de ChangeRequest (spec seção 7): idempotente por dedupe_key
// (um clique duplo ou retry de rede nunca cria protocolo duplicado — o
// dedupe_key é gerado uma vez por carregamento do formulário, no
// componente de servidor que o renderiza, e viaja como campo oculto).
//
// INFERIDO: o schema não tem um campo de "mensagem"/"descrição" livre —
// só `allocation_details` (Json), descrito na spec como "para repasses
// multi-pendência". Na falta de outro lugar para o requerente explicar o
// que está pedindo, este campo é reaproveitado para qualquer detalhe
// livre da solicitação (motivo, descrição, ids de lançamento referenciados
// etc.), não só para repasse.
import type { ChangeRequestRequesterType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateNextProtocol } from "@/lib/change-requests/protocol";
import { changeRequestCategoryForType } from "@/lib/change-requests/sla";

export async function submitChangeRequest(params: {
  type: string;
  requesterType: ChangeRequestRequesterType;
  requesterId: string;
  companyId?: string | null;
  reservationId?: string | null;
  allocationDetails?: Prisma.InputJsonValue;
  dedupeKey: string;
}) {
  const existing = await prisma.changeRequest.findUnique({ where: { dedupe_key: params.dedupeKey } });
  if (existing) {
    return existing;
  }

  const protocol = await generateNextProtocol();

  return prisma.changeRequest.create({
    data: {
      protocol,
      category: changeRequestCategoryForType(params.type),
      type: params.type,
      requester_type: params.requesterType,
      requester_id: params.requesterId,
      company_id: params.companyId,
      reservation_id: params.reservationId,
      allocation_details: params.allocationDetails,
      dedupe_key: params.dedupeKey,
    },
  });
}
