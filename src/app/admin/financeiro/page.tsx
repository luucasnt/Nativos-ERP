import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { linkClass, tableClass, tdClass, thClass } from "@/lib/ui";
import {
  FINANCE_ENTRY_CATEGORY_LABEL,
  FINANCE_ENTRY_STATUS_LABEL,
  FINANCE_ENTRY_TYPE_LABEL,
  FINANCE_PARTY_TYPE_LABEL,
} from "@/lib/finance/labels";
import { RegisterPaymentForm } from "@/components/admin/register-payment-form";
import { registerPayment } from "./actions";

// Painel somente-leitura sobre o razão gerado pelo motor financeiro
// (src/lib/finance/settlement.ts, ledger.ts, commissions.ts) — nenhuma
// edição de valor acontece aqui, só a ação de registrar um pagamento sobre
// um lançamento já elegível. Nenhuma linha desaparece: cancelamento e
// estorno são sempre uma mudança de status/novo registro, nunca DELETE
// (ver prisma/migrations/20260912150700_financial_integrity_triggers).
export default async function FinanceiroPage() {
  const entries = await prisma.financeEntry.findMany({
    orderBy: { created_at: "desc" },
    take: 200,
    include: {
      reservation: { include: { client: true } },
      service: true,
    },
  });

  const companyIds = new Set<string>();
  const driverIds = new Set<string>();
  for (const entry of entries) {
    if (!entry.party_id) continue;
    if (entry.party_type === "fornecedor" || entry.party_type === "parceiro") {
      companyIds.add(entry.party_id);
    } else if (entry.party_type === "motorista") {
      driverIds.add(entry.party_id);
    }
  }

  const [companies, drivers] = await Promise.all([
    prisma.company.findMany({ where: { id: { in: [...companyIds] } }, select: { id: true, name: true } }),
    prisma.driver.findMany({ where: { id: { in: [...driverIds] } }, select: { id: true, name: true } }),
  ]);
  const companyNameById = new Map(companies.map((c) => [c.id, c.name]));
  const driverNameById = new Map(drivers.map((d) => [d.id, d.name]));

  function partyName(entry: (typeof entries)[number]) {
    switch (entry.party_type) {
      case "cliente":
        return entry.reservation?.client.name ?? "—";
      case "fornecedor":
      case "parceiro":
        return (entry.party_id && companyNameById.get(entry.party_id)) ?? "—";
      case "motorista":
        return (entry.party_id && driverNameById.get(entry.party_id)) ?? "—";
      case "pessoa_fisica":
        return entry.reservation?.referrer_name ?? "—";
      case "interno":
        return "Interno";
      default:
        return "—";
    }
  }

  const totals = entries.reduce(
    (acc, e) => {
      if (e.status === "cancelado") return acc;
      const amount = Number(e.amount);
      if (e.type === "receita") acc.receita += amount;
      else acc.despesa += amount;
      return acc;
    },
    { receita: 0, despesa: 0 },
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-forest">Financeiro</h1>
        <p className="mt-2 text-forest/60">
          Lançamentos gerados automaticamente pelo motor financeiro a partir do
          aceite e conclusão dos serviços. Últimos 200 registros.
        </p>
      </div>

      <div className="mb-6 flex gap-6 text-sm">
        <div>
          <span className="text-forest/60">Receita (não cancelada): </span>
          <span className="font-medium text-forest">
            {totals.receita.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
        </div>
        <div>
          <span className="text-forest/60">Despesa (não cancelada): </span>
          <span className="font-medium text-forest">
            {totals.despesa.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="text-forest/60">Nenhum lançamento gerado ainda.</p>
      ) : (
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={thClass}>Data</th>
              <th className={thClass}>Tipo</th>
              <th className={thClass}>Categoria</th>
              <th className={thClass}>Contraparte</th>
              <th className={thClass}>Reserva</th>
              <th className={thClass}>Valor</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Elegível</th>
              <th className={thClass}></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td className={tdClass}>{entry.created_at.toLocaleDateString("pt-BR")}</td>
                <td className={tdClass}>{FINANCE_ENTRY_TYPE_LABEL[entry.type]}</td>
                <td className={tdClass}>{FINANCE_ENTRY_CATEGORY_LABEL[entry.category]}</td>
                <td className={tdClass}>
                  {partyName(entry)}
                  <span className="ml-1 text-xs text-forest/50">
                    ({FINANCE_PARTY_TYPE_LABEL[entry.party_type]})
                  </span>
                </td>
                <td className={tdClass}>
                  {entry.reservation ? (
                    <Link href={`/admin/reservas/${entry.reservation.id}`} className={linkClass}>
                      {entry.reservation.code}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className={tdClass}>
                  {Number(entry.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </td>
                <td className={tdClass}>
                  {FINANCE_ENTRY_STATUS_LABEL[entry.status]}
                  {entry.reversed_at && (
                    <span className="ml-2 rounded-sm bg-gold/20 px-1.5 py-0.5 text-xs text-forest">
                      revertido
                    </span>
                  )}
                </td>
                <td className={tdClass}>{entry.payment_eligible ? "Sim" : "Não"}</td>
                <td className={tdClass}>
                  {entry.payment_eligible && entry.status === "pendente" && (
                    <RegisterPaymentForm entryId={entry.id} onRegister={registerPayment} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
