import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createService } from "../actions";
import { ServiceForm } from "../service-form";

export default async function NovoServicoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: reservationId } = await params;

  const [reservation, suppliers, drivers, vehicles, disposicaoPackages] = await Promise.all([
    prisma.reservation.findUnique({ where: { id: reservationId } }),
    prisma.company.findMany({
      where: { roles: { has: "fornecedor" } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.driver.findMany({
      where: { status: "ativo", approval_status: "aprovado" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, owner_type: true, supplier_id: true },
    }),
    prisma.vehicle.findMany({
      where: { status: "ativo", approval_status: "aprovado" },
      orderBy: { model: "asc" },
      select: { id: true, model: true, plate: true, owner_type: true, supplier_id: true },
    }),
    prisma.catalogItem.findMany({
      where: { type: "pacote_disposicao", active: true },
      orderBy: { order: "asc" },
      select: { id: true, label: true },
    }),
  ]);

  if (!reservation) {
    notFound();
  }

  const categories = await prisma.catalogItem.findMany({ where: { type: "tipo_veiculo", OR: [{ active: true }, { reservations_by_category: { some: { id: reservationId } } }, { services_by_category: { some: { reservation_id: reservationId } } }, { services_by_upgrade: { some: { reservation_id: reservationId } } }] }, orderBy: [{ order: "asc" }, { label: "asc" }], select: { id: true, label: true } });

  return (
    <div>
      <h1 className="mb-6 font-serif text-3xl text-forest">
        Novo serviço — {reservation.code}
      </h1>
      <ServiceForm
        categories={categories}
        reservationCategoryId={reservation.contracted_category_id}
        action={createService.bind(null, reservationId)}
        suppliers={suppliers}
        drivers={drivers}
        vehicles={vehicles.map((v) => ({ id: v.id, name: `${v.model} (${v.plate})`, owner_type: v.owner_type, supplier_id: v.supplier_id }))}
        disposicaoPackages={disposicaoPackages}
        cancelHref={`/admin/reservas/${reservationId}`}
      />
    </div>
  );
}
