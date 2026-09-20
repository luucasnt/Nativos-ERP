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

  const [categories, expenses, eligibleServices, vehicles] = await Promise.all([
    prisma.catalogItem.findMany({
      where: { type: "categoria_despesa", active: true },
      orderBy: { order: "asc" },
    }),
    prisma.serviceExpense.findMany({
      where: { driver_id: driver.id },
      include: { category: true, vehicle: true, service: { include: { reservation: true } } },
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
    prisma.vehicle.findMany({
      where: { owner_type: "proprio", status: { not: "inativo" } },
      select: { id: true, plate: true, model: true },
      orderBy: { plate: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-[1180px] space-y-6">
      <header>
        <p className="eyebrow">Prestação de contas</p>
        <h1 className="page-heading mt-1">Minhas despesas</h1>
        <p className="page-description">
          Registre custos de uma reserva ou despesas avulsas do veículo e acompanhe a análise da equipe Nativos.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <section className="surface-panel min-w-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-forest/10 px-5 py-4">
            <div>
              <h2 className="section-heading">Histórico</h2>
              <p className="mt-1 text-xs text-forest/58">
                Últimos {expenses.length} lançamentos.
              </p>
            </div>
            <ReceiptText size={18} className="text-gold" aria-hidden="true" />
          </div>

          {expenses.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-forest/58">
              Nenhuma despesa registrada.
            </p>
          ) : (
            <>
              <ul className="divide-y divide-forest/[0.075] xl:hidden">
                {expenses.map((expense) => (
                  <li key={expense.id} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-forest">
                          {expense.service?.reservation.code ?? "Despesa avulsa"}
                        </p>
                        <p className="mt-1 truncate text-xs text-forest/62">
                          {expense.service ? (SERVICE_TYPE_LABEL[expense.service.type] ?? expense.service.type) : expense.vehicle ? `${expense.vehicle.plate} · ${expense.vehicle.model}` : "Despesa de veículo"}
                        </p>
                      </div>
                      <Badge tone={statusTone(expense.status)}>
                        {SERVICE_EXPENSE_STATUS_LABEL[expense.status]}
                      </Badge>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-[#faf9f6] p-3 text-xs">
                      <div>
                        <dt className="text-[11px] uppercase tracking-[0.08em] text-forest/55">
                          Categoria
                        </dt>
                        <dd className="mt-1 text-forest/75">
                          {expense.category.label}
                        </dd>
                      </div>
                      <div className="text-right">
                        <dt className="text-[11px] uppercase tracking-[0.08em] text-forest/55">
                          Valor
                        </dt>
                        <dd className="mt-1 font-semibold text-forest">
                          {money.format(Number(expense.amount))}
                        </dd>
                      </div>
                      {expense.odometer_km != null && <div><dt className="text-[11px] uppercase tracking-[0.08em] text-forest/55">Odômetro</dt><dd className="mt-1 text-forest/75">{expense.odometer_km.toLocaleString("pt-BR")} km</dd></div>}
                      {expense.calculated_km_per_liter != null && <div className="text-right"><dt className="text-[11px] uppercase tracking-[0.08em] text-forest/55">Consumo</dt><dd className="mt-1 font-semibold text-forest">{Number(expense.calculated_km_per_liter).toFixed(2)} km/l</dd></div>}
                    </dl>
                    <p className="mt-2 text-[11px] text-forest/55">
                      Enviada em{" "}
                      {expense.created_at.toLocaleDateString("pt-BR", {
                        timeZone: "America/Bahia",
                      })}
                    </p>
                  </li>
                ))}
              </ul>

              <div className="hidden overflow-x-auto scrollbar-clean xl:block">
                <table className="w-full min-w-[650px] text-sm">
                  <thead>
                    <tr>
                      <th className="bg-[#faf9f6] px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-forest/55">
                        Data
                      </th>
                      <th className="bg-[#faf9f6] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-forest/55">
                        Serviço
                      </th>
                      <th className="bg-[#faf9f6] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-forest/55">
                        Categoria
                      </th>
                      <th className="bg-[#faf9f6] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-forest/55">
                        Valor
                      </th>
                      <th className="bg-[#faf9f6] px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-forest/55">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((expense) => (
                      <tr
                        key={expense.id}
                        className="border-t border-forest/[0.075] hover:bg-forest/[0.022]"
                      >
                        <td className="px-5 py-3.5 text-xs text-forest/55">
                          {expense.created_at.toLocaleDateString("pt-BR", {
                            timeZone: "America/Bahia",
                          })}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-xs font-medium text-ink">
                            {expense.service?.reservation.code ?? "Despesa avulsa"}
                          </p>
                          <p className="mt-1 text-[11px] text-forest/55">
                            {expense.service ? (SERVICE_TYPE_LABEL[expense.service.type] ?? expense.service.type) : expense.vehicle ? `${expense.vehicle.plate} · ${expense.vehicle.model}` : "Despesa de veículo"}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-forest/65">
                          {expense.category.label}
                        </td>
                        <td className="px-4 py-3.5 text-xs font-semibold text-forest">
                          {money.format(Number(expense.amount))}
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge tone={statusTone(expense.status)}>
                            {SERVICE_EXPENSE_STATUS_LABEL[expense.status]}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <aside className="surface-panel p-5">
          <div className="flex items-center gap-2">
            <Plus size={17} className="text-gold" aria-hidden="true" />
            <h2 className="section-heading">Registrar despesa</h2>
          </div>
          <p className="mb-4 mt-1 text-xs leading-5 text-forest/58">
            A reserva é opcional. Para despesas avulsas, selecione apenas o veículo.
          </p>
          <ExpenseForm
            dedupeKey={crypto.randomUUID()}
            services={eligibleServices.map((service) => ({
              id: service.id,
              label:
                service.reservation.code +
                " — " +
                (SERVICE_TYPE_LABEL[service.type] ?? service.type),
            }))}
            categories={categories}
            vehicles={vehicles.map((vehicle) => ({ id: vehicle.id, label: `${vehicle.plate} — ${vehicle.model}` }))}
          />
        </aside>
      </div>
    </div>
  );
}
