import { NextResponse } from "next/server";
import { requireFinancialUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";

function csvCell(value: unknown) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }

export async function GET() {
  await requireFinancialUser();
  const from = new Date(); from.setUTCDate(from.getUTCDate() - 365); from.setUTCHours(0, 0, 0, 0);
  const services = await prisma.service.findMany({ where: { scheduled_date: { gte: from } }, include: { reservation: { include: { client: true } }, supplier: true, driver: true, vehicle: true, service_expenses: { where: { status: { not: "rejeitado" } }, select: { amount: true } } }, orderBy: { scheduled_date: "desc" }, take: 5000 });
  const rows = ["reserva;data;cliente;fornecedor;motorista;veiculo;valor_bruto;custos;valor_liquido", ...services.map((service) => { const costs = service.service_expenses.reduce((sum, expense) => sum + Number(expense.amount), 0) + Number(service.supplier_cost ?? 0); return [service.reservation.code, service.scheduled_date?.toISOString().slice(0, 10), service.reservation.client.name, service.supplier?.name ?? "", service.driver?.name ?? "", service.vehicle?.plate ?? "", Number(service.price).toFixed(2), costs.toFixed(2), Math.max(0, Number(service.price) - costs).toFixed(2)].map(csvCell).join(";"); })].join("\n");
  return new NextResponse("\ufeff" + rows, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="nativos-relatorio-gerencial.csv"' } });
}
