import { prisma } from "@/lib/prisma";
import { createDriver } from "../actions";
import { DriverForm } from "../driver-form";

export default async function NovoMotoristaPage() {
  const [suppliers, commissionDefaults] = await Promise.all([
    prisma.company.findMany({
      where: { roles: { has: "fornecedor" } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.commissionDefault.findMany({
      where: { target: "driver", active: true },
      select: { category_key: true, commission_percent: true },
    }),
  ]);

  return (
    <div>
      <h1 className="mb-6 font-serif text-3xl text-forest">Novo motorista</h1>
      <DriverForm
        action={createDriver}
        suppliers={suppliers}
        commissionDefaults={commissionDefaults.map((d) => ({
          category_key: d.category_key,
          commission_percent: d.commission_percent.toString(),
        }))}
      />
    </div>
  );
}
