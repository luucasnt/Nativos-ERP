import { prisma } from "@/lib/prisma";
import { tableClass, tdClass, thClass } from "@/lib/ui";
import { ExpenseReviewActions } from "@/components/admin/expense-review-actions";

export default async function DespesasPage() {
  const expenses = await prisma.serviceExpense.findMany({
    where: { status: "pendente" },
    include: { driver: true, service: { include: { reservation: true } }, category: true },
    orderBy: { created_at: "asc" },
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
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={thClass}>Motorista</th>
              <th className={thClass}>Reserva</th>
              <th className={thClass}>Categoria</th>
              <th className={thClass}>Valor</th>
              <th className={thClass}>Comprovante</th>
              <th className={thClass}></th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id}>
                <td className={tdClass}>{e.driver.name}</td>
                <td className={tdClass}>{e.service.reservation.code}</td>
                <td className={tdClass}>{e.category.label}</td>
                <td className={tdClass}>
                  {Number(e.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </td>
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
      )}
    </div>
  );
}
