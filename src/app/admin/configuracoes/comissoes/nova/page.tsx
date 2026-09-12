import { prisma } from "@/lib/prisma";
import { createCommissionDefault } from "../actions";
import { CommissionForm } from "../commission-form";

export default async function NovaComissaoPage() {
  const categories = await prisma.catalogItem.findMany({
    where: { type: "categoria_fornecedor_parceiro", active: true },
    orderBy: { order: "asc" },
    select: { key: true, label: true },
  });

  return (
    <div>
      <h1 className="mb-6 font-serif text-3xl text-forest">Nova regra de comissão</h1>
      <CommissionForm action={createCommissionDefault} companyCategories={categories} />
    </div>
  );
}
