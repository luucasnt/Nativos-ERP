import { prisma } from "@/lib/prisma";
import { createCompany } from "../actions";
import { CompanyForm } from "../company-form";

export default async function NovaEmpresaPage() {
  const categories = await prisma.catalogItem.findMany({
      where: { type: "categoria_fornecedor_parceiro", active: true },
      orderBy: { order: "asc" },
      select: { id: true, key: true, label: true },
  });

  return (
    <div>
      <h1 className="mb-6 font-serif text-3xl text-forest">Nova empresa</h1>
      <CompanyForm
        action={createCompany}
        categories={categories}
      />
    </div>
  );
}
