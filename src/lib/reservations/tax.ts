// Sem "server-only" — ver nota em status.ts: precisa ser importável em
// testes de integração via Vitest.
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type TaxSetting = { percentual: number | null };

// INFERIDO (sinalizado desde a Fase 1; ajustado na revisão da Fase 3): a
// especificação define os campos (tax_amount, tax_percent_snapshot,
// nf_value) mas não a fórmula exata. Regras confirmadas pelo cliente:
//
// - Nenhuma alíquota é "de fábrica": não há percentual seedado, e esta
//   função nunca inventa um valor. Uma reserva com requires_nf só calcula
//   imposto depois que existir uma alíquota definida manualmente pelo
//   admin — pelo padrão global (Configurações > Impostos) OU
//   especificamente nesta reserva (sobrepõe o padrão).
// - Enquanto nenhuma das duas existir, tax_percent_snapshot/tax_amount/
//   nf_value ficam todos null — nada é calculado.
// - Assim que uma alíquota existir (por qualquer um dos dois caminhos) e
//   esta função rodar, o percentual é gravado em tax_percent_snapshot e
//   fica congelado ali: mudar o padrão global depois não afeta reservas já
//   calculadas, só novas. Editar o percentual desta reserva específica no
//   formulário de reserva é uma ação manual direta (não passa por esta
//   função para decidir o valor) e sempre tem efeito imediato.
// - A base de cálculo é a soma do `price` (já líquido de desconto) dos
//   serviços não cancelados; nf_value é essa mesma base, tax_amount é a
//   alíquota aplicada sobre ela.
export async function recalculateReservationTax(reservationId: string) {
  const reservation = await prisma.reservation.findUniqueOrThrow({
    where: { id: reservationId },
    include: { services: true },
  });

  if (!reservation.requires_nf) {
    await prisma.reservation.update({
      where: { id: reservationId },
      data: { tax_percent_snapshot: null, tax_amount: null, nf_value: null },
    });
    return;
  }

  let percent = reservation.tax_percent_snapshot;

  if (percent === null) {
    const setting = await prisma.setting.findUnique({ where: { key: "imposto_padrao" } });
    const value = setting?.value as TaxSetting | undefined;
    if (value?.percentual !== null && value?.percentual !== undefined) {
      percent = new Prisma.Decimal(value.percentual);
    }
  }

  if (percent === null) {
    // Nenhuma alíquota definida ainda (nem padrão global, nem específica
    // desta reserva) — não calcula nada, e não congela nada com um valor
    // chutado. nf_value/tax_amount ficam null até o admin definir uma.
    await prisma.reservation.update({
      where: { id: reservationId },
      data: { tax_amount: null, nf_value: null },
    });
    return;
  }

  const base = reservation.services
    .filter((s) => s.execution_status !== "cancelado")
    .reduce((sum, s) => sum.add(s.price), new Prisma.Decimal(0));

  const taxAmount = base.mul(percent).div(100);

  await prisma.reservation.update({
    where: { id: reservationId },
    data: {
      tax_percent_snapshot: percent,
      tax_amount: taxAmount,
      nf_value: base,
    },
  });
}
