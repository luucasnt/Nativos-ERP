import { prisma } from "@/lib/prisma";
import { createCompany } from "../actions";
import { CompanyForm } from "../company-form";

export default async function NovaEmpresaPage() {
  const [categories, commissionDefaults] = await Promise.all([
    prisma.catalogItem.findMany({
      where: { type: "categoria_fornecedor_parceiro", active: true },
      orderBy: { order: "asc" },
      select: { id: true, key: true, label: true },
    }),
    prisma.commissionDefault.findMany({
      where: { target: "company", active: true },
      select: { category_key: true, commission_percent: true },
    }),
  ]);

  return (
    <div>
      <h1 className="mb-6 font-serif text-3xl text-forest">Nova empresa</h1>
      <CompanyForm
        action={createCompany}
        categories={categories}
        commissionDefaults={commissionDefaults.map((d) => ({
          category_key: d.category_key,
          commission_percent: d.commission_percent.toString(),
        }))}
      />
    </div>
  );
}
