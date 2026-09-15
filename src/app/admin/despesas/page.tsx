import { prisma } from "@/lib/prisma";
import { tableClass, tdClass, thClass } from "@/lib/ui";
import { ExpenseReviewActions } from "@/components/admin/expense-review-actions";

export default async function DespesasPage() {
  const expenses = await prisma.serviceExpense.findMany({
    where: { status: "pendente" },
    select: {
      id: true,
      amount: true,
      receipt_url: true,
      driver: { select: { name: true } },
      category: { select: { label: true } },
      odometer_km: true,
      quantity: true,
      calculated_km_per_liter: true,
      service: { select: { reservation: { select: { code: true } } } },
      vehicle: { select: { plate: true, model: true } },
    },
    orderBy: { created_at: "asc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="mb-2 font-serif text-3xl text-forest">Despesas de motorista</h1>
      <p className="mb-6 text-forest/60">
        Despesas registradas pelos motoristas pelo portal, aguardando revisão.
        Aprovar gera automaticamente um lançamento de repasse no financeiro.
      </p>

      {expenses.length === 0 ? (
        <p className="text-forest/60">Nenhuma despesa pendente.</p>
      ) : (
        <>
          <ul className="grid gap-3 xl:hidden">
            {expenses.map((expense) => (
              <li key={expense.id} className="surface-panel p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{expense.driver.name}</p>
                    <p className="mt-1 text-xs text-forest/60">{expense.service?.reservation?.code ? `Reserva ${expense.service.reservation.code}` : `Despesa avulsa · ${expense.vehicle?.plate ?? "veículo"}`}</p>
                  </div>
                  <strong className="shrink-0 text-sm text-forest">
                    {Number(expense.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </strong>
                </div>
                <p className="mt-3 text-xs text-forest/58">{expense.category.label}</p>
                {(expense.odometer_km != null || expense.quantity != null) && <p className="mt-2 text-xs text-forest/58">{expense.odometer_km != null ? `${expense.odometer_km.toLocaleString("pt-BR")} km` : "KM não informado"}{expense.quantity != null ? ` · ${Number(expense.quantity).toFixed(3)} L` : ""}{expense.calculated_km_per_liter != null ? ` · ${Number(expense.calculated_km_per_liter).toFixed(2)} km/l` : ""}</p>}
                {expense.receipt_url && (
                  <a href={expense.receipt_url} target="_blank" rel="noreferrer" className="focus-ring mt-3 inline-flex min-h-11 items-center text-xs font-semibold text-forest underline">
                    Ver comprovante
                  </a>
                )}
                <div className="mt-4 border-t border-forest/10 pt-4">
                  <ExpenseReviewActions expenseId={expense.id} />
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto xl:block">
            <table className={tableClass}>
          <thead>
            <tr>
              <th className={thClass}>Motorista</th>
              <th className={thClass}>Reserva</th>
              <th className={thClass}>Categoria</th>
              <th className={thClass}>Valor</th>
              <th className={thClass}>Controle</th>
              <th className={thClass}>Comprovante</th>
              <th className={thClass}></th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id}>
                <td className={tdClass}>{e.driver.name}</td>
                <td className={tdClass}>{e.service?.reservation?.code ?? `Avulsa · ${e.vehicle?.plate ?? "—"}`}</td>
                <td className={tdClass}>{e.category.label}</td>
                <td className={tdClass}>
                  {Number(e.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </td>
                <td className={tdClass}>{e.odometer_km != null ? `${e.odometer_km.toLocaleString("pt-BR")} km` : "—"}{e.calculated_km_per_liter != null ? ` · ${Number(e.calculated_km_per_liter).toFixed(2)} km/l` : ""}</td>
                <td className={tdClass}>
                  {e.receipt_url ? (
                    <a href={e.receipt_url} target="_blank" rel="noreferrer" className="text-forest underline">
                      Ver
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className={tdClass}>
                  <ExpenseReviewActions expenseId={e.id} />
                </td>
              </tr>
            ))}
          </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
