import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { deleteCommissionDefault, updateCommissionDefault } from "../actions";
import { CommissionForm } from "../commission-form";
import { DeleteButton } from "@/components/admin/delete-button";

export default async function EditarComissaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [rule, categories] = await Promise.all([
    prisma.commissionDefault.findUnique({ where: { id } }),
    prisma.catalogItem.findMany({
      where: { type: "categoria_fornecedor_parceiro", active: true },
      orderBy: { order: "asc" },
      select: { key: true, label: true },
    }),
  ]);

  if (!rule) {
    notFound();
  }

  async function handleDelete() {
    "use server";
    await deleteCommissionDefault(id);
    redirect("/admin/configuracoes/comissoes");
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-3xl text-forest">Editar regra</h1>
        <DeleteButton action={handleDelete} confirmMessage="Excluir esta regra de comissão?" />
      </div>
      <CommissionForm
        action={updateCommissionDefault.bind(null, id)}
        companyCategories={categories}
        defaultValues={{
          target: rule.target,
          category_key: rule.category_key,
          commission_percent: rule.commission_percent.toString(),
          active: rule.active,
        }}
      />
    </div>
  );
}
