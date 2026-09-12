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

  if (!reservation) {
    notFound();
  }

  return (
    <div>
      <h1 className="mb-6 font-serif text-3xl text-forest">
        Novo serviço — {reservation.code}
      </h1>
      <ServiceForm
        action={createService.bind(null, reservationId)}
        suppliers={suppliers}
        drivers={drivers}
        vehicles={vehicles.map((v) => ({ id: v.id, name: `${v.model} (${v.plate})` }))}
        disposicaoPackages={disposicaoPackages}
        cancelHref={`/admin/reservas/${reservationId}`}
      />
    </div>
  );
}
