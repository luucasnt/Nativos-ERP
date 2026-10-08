import { Prisma, ReservationStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
export type ReportParams = { empresa?: string; de?: string; ate?: string; status?: string };
export function reportFilters(params: ReportParams, now = new Date()) {
  const fallback = new Date(now); fallback.setUTCDate(fallback.getUTCDate() - 30); fallback.setUTCHours(0, 0, 0, 0);
  const validDate = (value: string | undefined, otherwise: Date) => value && z.iso.date().safeParse(value).success ? new Date(`${value}T00:00:00Z`) : new Date(otherwise);
  const from = validDate(params.de, fallback), to = validDate(params.ate, now); to.setUTCHours(23, 59, 59, 999);
  const companyId = z.uuid().safeParse(params.empresa).success ? params.empresa : undefined;
  const status = z.enum(ReservationStatus).safeParse(params.status);
  const where: Prisma.ReservationWhereInput = { created_at: { gte: from, lte: to },
    ...(status.success ? { status: status.data } : {}),
    ...(companyId ? { OR: [{ origin_partner_id: companyId }, { services: { some: { supplier_id: companyId } } }] } : {}),
  };
  return { from, to, companyId, where };
}
export function loadReportReservations(where: Prisma.ReservationWhereInput) {
  return prisma.reservation.findMany({ where, include: {
    client: { select: { name: true } }, origin_partner: { select: { name: true } },
    services: { include: { supplier: { select: { name: true } }, driver: { select: { name: true } }, vehicle: { select: { plate: true, model: true } }, service_expenses: { where: { status: { not: "rejeitado" } }, select: { amount: true } } } },
  }, orderBy: { created_at: "desc" }, take: 500 });
}
export function csvCell(value: unknown) {
  let text = String(value ?? "");
  // Quoting alone does not prevent spreadsheet formula execution.
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return `"${text.replaceAll('"', '""')}"`;
}
