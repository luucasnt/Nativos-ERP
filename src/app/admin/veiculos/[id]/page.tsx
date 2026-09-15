import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { approveVehicle, rejectVehicle, updateVehicle } from "../actions";
import { VehicleForm } from "../vehicle-form";
import { ApprovalActions } from "@/components/admin/approval-actions";

export default async function EditarVeiculoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [vehicle, categories, suppliers] = await Promise.all([
    prisma.vehicle.findUnique({ where: { id } }),
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

  if (!vehicle) {
    notFound();
  }

  return (
    <div>
      <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <h1 className="font-serif text-3xl text-forest">Editar veículo</h1>
        {vehicle.approval_status === "pendente" && (
          <ApprovalActions
            onApprove={approveVehicle.bind(null, id)}
            onReject={rejectVehicle.bind(null, id)}
          />
        )}
      </div>

      {vehicle.created_from_portal && vehicle.approval_status === "pendente" && (
        <p className="mb-6 max-w-xl rounded-sm bg-gold/10 p-3 text-sm text-forest">
          Este veículo foi cadastrado pelo fornecedor pelo portal e está
          aguardando aprovação.
        </p>
      )}

      <VehicleForm
        action={updateVehicle.bind(null, id)}
        categories={categories}
        suppliers={suppliers}
        defaultValues={{
          plate: vehicle.plate,
          model: vehicle.model,
          category_id: vehicle.category_id,
          capacity: vehicle.capacity,
          owner_type: vehicle.owner_type,
          supplier_id: vehicle.supplier_id,
          status: vehicle.status,
          initial_odometer_km: vehicle.initial_odometer_km,
        }}
      />
    </div>
  );
}
