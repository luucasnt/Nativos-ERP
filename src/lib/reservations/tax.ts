// Sem "server-only" — ver nota em status.ts: precisa ser importável em
// testes de integração via Vitest.
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type TaxSetting = { percentual: number };

// INFERIDO (sinalizado desde a Fase 1): a especificação define os campos
// (tax_amount, tax_percent_snapshot, nf_value) mas não a fórmula exata.
// Regra adotada: quando requires_nf, o percentual é "congelado"
// (tax_percent_snapshot) na primeira vez que a reserva é calculada, usando
// o padrão global em Setting["imposto_padrao"] — mudanças futuras nesse
// padrão não afetam reservas já calculadas, só novas. A base de cálculo é
// a soma do `price` (já líquido de desconto) dos serviços não cancelados;
// nf_value é essa mesma base, tax_amount é a alíquota aplicada sobre ela.
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
    percent = new Prisma.Decimal(value?.percentual ?? 0);
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
