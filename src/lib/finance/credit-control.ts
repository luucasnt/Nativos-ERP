import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type CompanyCreditResult = {
  blocked: boolean;
  reason: string | null;
  outstanding: Prisma.Decimal;
  overdue: Prisma.Decimal;
};

/** Regras centrais para não deixar a UI ser a única barreira de crédito. */
export async function checkCompanyCredit(params: {
  companyId: string;
  additionalAmount?: Prisma.Decimal.Value;
}): Promise<CompanyCreditResult> {
  const company = await prisma.company.findUnique({
    where: { id: params.companyId },
    select: { name: true, billing_limit: true, limite_inadimplencia: true, billing_enabled: true, modelo_parceiro: true },
  });
  if (!company) throw new Error("Empresa não encontrada.");

  const entries = await prisma.financeEntry.findMany({
    where: {
      party_id: params.companyId,
      party_type: { in: ["parceiro", "fornecedor"] },
      type: "receita",
      status: { in: ["programado", "pendente", "vencido"] },
      reversed_at: null,
    },
    select: { amount: true, due_date: true, payments: { where: { reversed_at: null, estorno_of_id: null }, select: { amount: true } }, compensacao: { select: { amount: true, status: true, reversed_at: true } } },
  });

  const outstanding = entries.reduce((sum, entry) => {
    const paid = entry.payments.reduce((value, payment) => value.plus(payment.amount), new Prisma.Decimal(0));
    const compensated = entry.compensacao?.status === "confirmada" && !entry.compensacao.reversed_at ? entry.compensacao.amount : new Prisma.Decimal(0);
    return sum.plus(Prisma.Decimal.max(new Prisma.Decimal(0), entry.amount.minus(paid).minus(compensated)));
  }, new Prisma.Decimal(0));
  const now = new Date();
  const overdue = entries.reduce((sum, entry) => {
    if (!entry.due_date || entry.due_date >= now) return sum;
    const paid = entry.payments.reduce((value, payment) => value.plus(payment.amount), new Prisma.Decimal(0));
    const compensated = entry.compensacao?.status === "confirmada" && !entry.compensacao.reversed_at ? entry.compensacao.amount : new Prisma.Decimal(0);
    return sum.plus(Prisma.Decimal.max(new Prisma.Decimal(0), entry.amount.minus(paid).minus(compensated)));
  }, new Prisma.Decimal(0));

  const additional = new Prisma.Decimal(params.additionalAmount ?? 0);
  const isBilledPartner = company.billing_enabled || company.modelo_parceiro === "faturado" || company.modelo_parceiro === "ambos";
  if (isBilledPartner && company.billing_limit && outstanding.plus(additional).gt(company.billing_limit)) {
    return { blocked: true, reason: `${company.name} excede o limite de faturamento de R$ ${company.billing_limit.toFixed(2)}. Saldo em aberto: R$ ${outstanding.toFixed(2)}.`, outstanding, overdue };
  }
  if (company.limite_inadimplencia && overdue.gt(company.limite_inadimplencia)) {
    return { blocked: true, reason: `${company.name} está inadimplente acima do limite permitido. Vencido: R$ ${overdue.toFixed(2)}.`, outstanding, overdue };
  }
  return { blocked: false, reason: null, outstanding, overdue };
}
