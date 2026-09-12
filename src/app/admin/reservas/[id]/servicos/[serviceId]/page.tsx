import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { cancelService, updateService } from "../actions";
import { ServiceForm } from "../service-form";
import { InternalAcceptancePanel } from "./internal-acceptance-panel";
import { DeleteButton } from "@/components/admin/delete-button";

export default async function EditarServicoPage({
  params,
}: {
  params: Promise<{ id: string; serviceId: string }>;
}) {
  const { id: reservationId, serviceId } = await params;

  const [reservation, service, suppliers, drivers, vehicles, disposicaoPackages] =
    await Promise.all([
      prisma.reservation.findUnique({ where: { id: reservationId } }),
      prisma.service.findUnique({ where: { id: serviceId } }),
      prisma.company.findMany({
        where: { roles: { has: "fornecedor" } },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.driver.findMany({
        where: { status: "ativo", approval_status: "aprovado" },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.vehicle.findMany({
        where: { status: "ativo", approval_status: "aprovado" },
        orderBy: { model: "asc" },
        select: { id: true, model: true, plate: true },
      }),
      prisma.catalogItem.findMany({
        where: { type: "pacote_disposicao", active: true },
        orderBy: { order: "asc" },
        select: { id: true, label: true },
      }),
    ]);

  if (!reservation || !service || service.reservation_id !== reservationId) {
    notFound();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-3xl text-forest">
          Editar serviço — {reservation.code}
        </h1>
        {service.execution_status !== "cancelado" && (
          <DeleteButton
            action={cancelService.bind(null, reservationId, serviceId)}
            confirmMessage="Cancelar este serviço?"
            label="Cancelar serviço"
          />
        )}
      </div>

      <p className="mb-4 text-sm text-forest/60">
        Status de execução: <strong>{service.execution_status}</strong> ·
        Aceite: <strong>{service.acceptance_status}</strong> · Cobrança:{" "}
        <strong>{service.collection_actor}</strong>
      </p>

      {service.acceptance_status === "aguardando_aceite" && (
        <InternalAcceptancePanel reservationId={reservationId} serviceId={serviceId} />
      )}

      {service.acceptance_status === "recusado" && service.acceptance_reason && (
        <p className="mb-6 rounded-sm bg-red-50 p-3 text-sm text-red-800">
          Recusado pelo fornecedor: {service.acceptance_reason}
        </p>
      )}

      <ServiceForm
        action={updateService.bind(null, reservationId, serviceId)}
        suppliers={suppliers}
        drivers={drivers}
        vehicles={vehicles.map((v) => ({ id: v.id, name: `${v.model} (${v.plate})` }))}
        disposicaoPackages={disposicaoPackages}
        cancelHref={`/admin/reservas/${reservationId}`}
        isEditing
        defaultValues={{
          type: service.type,
          execution_type: service.execution_type,
          supplier_id: service.supplier_id,
          driver_id: service.driver_id,
          vehicle_id: service.vehicle_id,
          scheduled_date: service.scheduled_date
            ? service.scheduled_date.toISOString().slice(0, 10)
            : null,
          scheduled_time: service.scheduled_time,
          pickup_location: service.pickup_location,
          dropoff_location: service.dropoff_location,
          passenger_count: service.passenger_count,
          flight_number: service.flight_number,
          notes: service.notes,
          pacote_disposicao_id: service.pacote_disposicao_id,
          km_incluido: service.km_incluido?.toString() ?? null,
          valor_hora_extra: service.valor_hora_extra?.toString() ?? null,
          valor_km_extra: service.valor_km_extra?.toString() ?? null,
          original_price: service.original_price.toString(),
          supplier_cost: service.supplier_cost?.toString() ?? null,
          discount_type: service.discount_type,
          discount_value: service.discount_value?.toString() ?? null,
          discount_reason: service.discount_reason,
          luggage_10kg: service.luggage_10kg,
          luggage_23kg: service.luggage_23kg,
          luggage_32kg: service.luggage_32kg,
          bebe_conforto: service.bebe_conforto,
          cadeirinha: service.cadeirinha,
          booster: service.booster,
          driver_can_receive_payment: service.driver_can_receive_payment,
          reception_sign_enabled: service.reception_sign_enabled,
          reception_passenger_name: service.reception_passenger_name,
          os_show_price: service.os_show_price,
        }}
      />
    </div>
  );
}
