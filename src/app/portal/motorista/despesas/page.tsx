import { Plus, ReceiptText } from "lucide-react";
import { ExpenseForm } from "@/components/portal/expense-form";
import { Badge } from "@/components/ui/badge";
import { requireDriverPortalUser } from "@/lib/auth/get-current-user";
import { SERVICE_EXPENSE_STATUS_LABEL } from "@/lib/finance/labels";
import { prisma } from "@/lib/prisma";
import { SERVICE_TYPE_LABEL } from "@/lib/reservations/service-type-labels";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function statusTone(status: string): "success" | "danger" | "warning" {
  if (status === "aprovado") return "success";
  if (status === "rejeitado") return "danger";
  return "warning";
}

export default async function PortalMotoristaDespesasPage() {
  const user = await requireDriverPortalUser();
  const driver = user.linked_driver;

  const [categories, expenses, eligibleServices] = await Promise.all([
    prisma.catalogItem.findMany({
      where: { type: "categoria_despesa", active: true },
      orderBy: { order: "asc" },
    }),
    prisma.serviceExpense.findMany({
      where: { driver_id: driver.id },
      include: { category: true, service: { include: { reservation: true } } },
      orderBy: { created_at: "desc" },
      take: 100,
    }),
    prisma.service.findMany({
      where: {
        driver_id: driver.id,
        execution_status: { in: ["em_andamento", "concluido"] },
      },
      include: { reservation: true },
      orderBy: { scheduled_date: "desc" },
      take: 40,
    }),
  ]);

  return (
    <div className="mx-auto max-w-[1180px] space-y-6">
      <header>
        <p className="eyebrow">Prestação de contas</p>
        <h1 className="page-heading mt-1">Minhas despesas</h1>
        <p className="page-description">Registre custos do serviço e acompanhe a análise da equipe Nativos.</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <section className="surface-panel min-w-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-forest/10 px-5 py-4">
            <div>
              <h2 className="section-heading">Histórico</h2>
              <p className="mt-1 text-xs text-forest/46">Últimos {expenses.length} lançamentos.</p>
            </div>
            <ReceiptText size={18} className="text-gold" aria-hidden="true" />
          </div>

          {expenses.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-forest/46">Nenhuma despesa registrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-sm">
                <thead>
                  <tr>
                    <th className="bg-[#faf9f6] px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Data</th>
                    <th className="bg-[#faf9f6] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Serviço</th>
                    <th className="bg-[#faf9f6] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Categoria</th>
                    <th className="bg-[#faf9f6] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Valor</th>
                    <th className="bg-[#faf9f6] px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-forest/42">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="border-t border-forest/[0.075] hover:bg-forest/[0.022]">
                      <td className="px-5 py-3.5 text-xs text-forest/55">
                        {expense.created_at.toLocaleDateString("pt-BR", { timeZone: "America/Bahia" })}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-xs font-medium text-ink">{expense.service.reservation.code}</p>
                        <p className="mt-1 text-[10px] text-forest/42">{SERVICE_TYPE_LABEL[expense.service.type] ?? expense.service.type}</p>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-forest/65">{expense.category.label}</td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-forest">{money.format(Number(expense.amount))}</td>
                      <td className="px-5 py-3.5">
                        <Badge tone={statusTone(expense.status)}>{SERVICE_EXPENSE_STATUS_LABEL[expense.status]}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="surface-panel p-5">
          <div className="flex items-center gap-2">
            <Plus size={17} className="text-gold" aria-hidden="true" />
            <h2 className="section-heading">Registrar despesa</h2>
          </div>
          <p className="mb-4 mt-1 text-xs leading-5 text-forest/46">Vincule o gasto ao serviço correspondente.</p>
          <ExpenseForm
            services={eligibleServices.map((service) => ({
              id: service.id,
              label: service.reservation.code + " — " + (SERVICE_TYPE_LABEL[service.type] ?? service.type),
            }))}
            categories={categories}
          />
        </aside>
      </div>
    </div>
  );
}

