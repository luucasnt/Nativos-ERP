import { prisma } from "@/lib/prisma";
import { createVehicle } from "../actions";
import { VehicleForm } from "../vehicle-form";

export default async function NovoVeiculoPage() {
  const [categories, suppliers] = await Promise.all([
    prisma.catalogItem.findMany({
      where: { type: "tipo_veiculo", active: true },
      orderBy: { order: "asc" },
      select: { id: true, label: true },
    }),
    prisma.company.findMany({
      where: { roles: { has: "fornecedor" } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div>
      <h1 className="mb-6 font-serif text-3xl text-forest">Novo veículo</h1>
      <VehicleForm action={createVehicle} categories={categories} suppliers={suppliers} />
    </div>
  );
}
