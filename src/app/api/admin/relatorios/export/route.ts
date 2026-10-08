import { NextResponse } from "next/server";
import { requireFinancialUser } from "@/lib/auth/get-current-user";
import { csvCell, loadReportReservations, reportFilters } from "@/lib/reports/management";
export async function GET(request: Request) {
  await requireFinancialUser();
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const filters = reportFilters(params);
  const reservations = await loadReportReservations(filters.where);
  const rows = ["reserva;data;cliente;fornecedor;motorista;veiculo;valor_bruto;custos;valor_liquido"];
  for (const reservation of reservations) for (const service of reservation.services) {
    if (filters.companyId && service.supplier_id !== filters.companyId && reservation.origin_partner_id !== filters.companyId) continue;
    const costs = service.service_expenses.reduce((sum, expense) => sum + Number(expense.amount), 0) + Number(service.supplier_cost ?? 0);
    rows.push([reservation.code, service.scheduled_date?.toISOString().slice(0, 10), reservation.client.name, service.supplier?.name ?? "", service.driver?.name ?? "", service.vehicle?.plate ?? "", Number(service.price).toFixed(2), costs.toFixed(2), Math.max(0, Number(service.price) - costs).toFixed(2)].map(csvCell).join(";"));
  }
  return new NextResponse("\ufeff" + rows.join("\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="nativos-relatorio-gerencial.csv"', "Cache-Control": "no-store" } });
}
