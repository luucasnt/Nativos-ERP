import Link from "next/link";
import { notFound } from "next/navigation";
import { requireFinancialUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { DeleteRecordButton } from "@/components/admin/delete-record-button";
import { secondaryButtonClass } from "@/lib/ui";
import { BankAccountForm } from "../form";
import { deleteBankAccount, updateBankAccount } from "../actions";
export default async function BankAccountPage({ params }: { params: Promise<{ id: string }> }) {
  await requireFinancialUser();
  const { id } = await params;
  const account = await prisma.bankAccount.findUnique({ where: { id } });
  if (!account) notFound();
  return <div className="max-w-2xl space-y-5"><h1 className="page-heading">Editar conta bancária</h1><Link className={secondaryButtonClass} href="/admin/configuracoes/bancos">Voltar às contas</Link><BankAccountForm onSave={updateBankAccount.bind(null, id)} defaultValues={{ name: account.name, type: account.type, pix_key: account.pix_key, initial_balance: account.initial_balance.toString() }} /><DeleteRecordButton id={id} label={`a conta ${account.name}`} action={deleteBankAccount} successHref="/admin/configuracoes/bancos" /></div>;
}
