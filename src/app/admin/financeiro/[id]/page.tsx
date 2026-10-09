import { effectivePaymentDate } from "@/lib/finance/payment-date";
import { canRegisterEntryPayment } from "@/lib/finance/payment-availability";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireFinancialUser } from "@/lib/auth/get-current-user";
import { isStandaloneManualEntry } from "@/lib/finance/manual-entry";
import { FINANCE_ENTRY_STATUS_LABEL, PAYMENT_METHOD_LABEL } from "@/lib/finance/labels";
import { secondaryButtonClass } from "@/lib/ui";
import { ManualFinanceForm } from "../novo/manual-finance-form";
import { FinanceReasonAction } from "@/components/admin/finance-reason-action";
import { RegisterPaymentForm } from "@/components/admin/register-payment-form";
import { cancelManualEntry, registerPaymentFromForm as registerPayment, reverseRegisteredPayment, updateManualEntry } from "../actions";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function FinanceEntryPage({ params }: { params: Promise<{ id: string }> }) {
  await requireFinancialUser();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const [entry, bankAccounts] = await Promise.all([
    prisma.financeEntry.findUnique({ where: { id }, include: { payments: { orderBy: { created_at: "desc" } }, compensacao: true, _count: { select: { reversals: true } } } }),
    prisma.bankAccount.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (!entry) notFound();
  const manual = isStandaloneManualEntry(entry);
  const active = entry.payments.filter((p) => !p.reversed_at && !p.estorno_of_id);
  const compensated = entry.compensacao?.status === "confirmada" && !entry.compensacao.reversed_at ? Math.min(Number(entry.amount), Number(entry.compensacao.amount)) : 0;
  const balance = Math.max(0, Number(entry.amount) - active.reduce((sum, p) => sum + Number(p.amount), 0) - compensated);
  const editable = manual && !entry.reversed_at && !["cancelado", "pago"].includes(entry.status) && !entry.compensacao_id && !entry.payments.length && !entry._count.reversals;

  return <div className="space-y-6">
    <header><p className="eyebrow">Financeiro</p><h1 className="page-heading mt-1">Detalhes do lançamento</h1><p className="page-description">{entry.description ?? "Lançamento financeiro"}</p></header>
    <Link href="/admin/financeiro" className={secondaryButtonClass}>Voltar ao financeiro</Link>
    <section className="surface-panel space-y-4 p-5">
      <dl className="grid gap-4 sm:grid-cols-3">
        <div><dt className="text-sm text-forest/60">Valor</dt><dd className="font-semibold">{money.format(Number(entry.amount))}</dd></div>
        <div><dt className="text-sm text-forest/60">Status</dt><dd>{FINANCE_ENTRY_STATUS_LABEL[entry.status]}</dd></div>
        <div><dt className="text-sm text-forest/60">Saldo</dt><dd>{entry.status === "cancelado" ? "Cancelado" : money.format(balance)}</dd></div>
      </dl>
      {!manual && <p className="text-sm text-forest/70">Este lançamento foi gerado pelo sistema. Alterações e cancelamentos devem ser feitos no registro de origem.</p>}
      {entry.reservation_id && <Link href={`/admin/reservas/${entry.reservation_id}`} className={secondaryButtonClass}>Abrir reserva de origem</Link>}
      {canRegisterEntryPayment(entry) && balance > 0 && <RegisterPaymentForm proofRequired={["cliente", "parceiro", "fornecedor"].includes(entry.party_type)} entryId={id} remainingAmount={balance.toFixed(2)} bankAccounts={bankAccounts} onRegister={registerPayment} />}
    </section>
    {editable && <section className="space-y-4"><h2 className="section-heading">Editar lançamento avulso</h2>
      <ManualFinanceForm key={entry.updated_at.toISOString()} onSave={updateManualEntry.bind(null, id)} defaultValues={{ type: entry.type, party_type: entry.party_type, description: entry.description ?? "", amount: entry.amount.toString(), due_date: entry.due_date?.toISOString().slice(0, 10) ?? "", updated_at: entry.updated_at.toISOString() }} />
      <FinanceReasonAction label="Excluir lançamento" explanation="O lançamento será cancelado e continuará no histórico, sem alterar pagamentos ou apagar registros." onConfirm={cancelManualEntry.bind(null, id)} />
    </section>}
    {manual && !editable && <p className="text-sm text-forest/70">Lançamentos cancelados, liquidados ou com histórico de pagamentos não permitem edição direta. Para corrigir um pagamento, use o estorno abaixo.</p>}
    <section className="surface-panel space-y-4 p-5"><h2 className="section-heading">Pagamentos e estornos</h2>
      {!entry.payments.length && <p className="text-sm text-forest/60">Nenhum pagamento registrado.</p>}
      <ul className="space-y-4">{entry.payments.map((payment) => <li key={payment.id} className="space-y-3 rounded-lg border border-forest/10 p-4">
        <p className="text-sm"><strong>{money.format(Number(payment.amount))}</strong> · {PAYMENT_METHOD_LABEL[payment.payment_method]} · {effectivePaymentDate(payment).toLocaleDateString("pt-BR", { timeZone: "America/Bahia" })} · {payment.estorno_of_id ? "Estorno" : payment.reversed_at ? "Estornado" : "Registrado"}</p>
        {payment.receipt_url && <a href={`/api/admin/comprovantes/${payment.id}`} target="_blank" rel="noreferrer" className={secondaryButtonClass}>Abrir comprovante</a>}
        {payment.reversal_reason && <p className="text-sm text-forest/60">Motivo: {payment.reversal_reason}</p>}
        {!payment.reversed_at && !payment.estorno_of_id && <>
          <a href={`/api/documentos/recibo/${payment.id}`} download className={secondaryButtonClass}>Abrir recibo</a>
          <FinanceReasonAction label="Estornar pagamento" explanation="O valor será retirado da liquidação e o saldo será recalculado. O pagamento original e o estorno permanecerão no histórico." onConfirm={reverseRegisteredPayment.bind(null, payment.id)} />
        </>}
      </li>)}</ul>
    </section>
  </div>;
}
