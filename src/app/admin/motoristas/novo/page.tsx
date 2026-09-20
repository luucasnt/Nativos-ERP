import { prisma } from "@/lib/prisma";
import { createDriver } from "../actions";
import { DriverForm } from "../driver-form";

export default async function NovoMotoristaPage() {
  const suppliers = await prisma.company.findMany({
      where: { roles: { has: "fornecedor" } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
  });

  return (
    <div>
      <h1 className="mb-6 font-serif text-3xl text-forest">Novo motorista</h1>
      <DriverForm
        action={createDriver}
        suppliers={suppliers}
      />
    </div>
  );
}
