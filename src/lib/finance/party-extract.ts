// Extrato somente-leitura de uma contraparte (parceiro/fornecedor/
// motorista) sobre o razão — reaproveitado pelos portais externos. Não é
// o BillingCycle (fechamento de fatura mensal, ainda não construído):
// é uma visão direta dos FinanceEntry já existentes, do jeito que o motor
// da Fase 4 os gerou.
import type { FinancePartyType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function getPartyFinanceExtract(partyType: FinancePartyType, partyId: string) {
  return prisma.financeEntry.findMany({
    where: { party_type: partyType, party_id: partyId },
    orderBy: { created_at: "desc" },
    take: 50,
    include: {
      reservation: { select: { id: true, code: true } },
      compensacao: { select: { amount: true, status: true, reversed_at: true } },
      payments: {
        where: { reversed_at: null, estorno_of_id: null },
        select: { amount: true },
      },
    },
  });
}
