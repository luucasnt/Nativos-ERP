import { redirect } from "next/navigation";
import { CarFront, Plus, Users } from "lucide-react";
import { DriverRegistrationForm } from "@/components/portal/driver-registration-form";
import { VehicleRegistrationForm } from "@/components/portal/vehicle-registration-form";
import { Badge } from "@/components/ui/badge";
import { requireCompanyPortalUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";

function approvalTone(status: string): "success" | "danger" | "warning" {
  if (status === "aprovado") return "success";
  if (status === "rejeitado") return "danger";
  return "warning";
}

function approvalLabel(status: string) {
  if (status === "aprovado") return "Aprovado";
  if (status === "rejeitado") return "Rejeitado";
  return "Em análise";
}

export default async function PortalEmpresaEquipePage() {
  const user = await requireCompanyPortalUser();
  const company = user.linked_company;

  if (!company.roles.includes("fornecedor")) {
    redirect("/portal/empresa");
  }

  const [drivers, vehicles, categories] = await Promise.all([
    prisma.driver.findMany({
      where: { supplier_id: company.id },
      orderBy: [{ approval_status: "asc" }, { name: "asc" }],
    }),
    prisma.vehicle.findMany({
      where: { supplier_id: company.id },
      include: { category: true },
      orderBy: [{ approval_status: "asc" }, { model: "asc" }],
    }),
    prisma.catalogItem.findMany({
      where: { type: "tipo_veiculo", active: true },
      orderBy: { order: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-[1360px] space-y-6">
      <header>
        <p className="eyebrow">Portal do fornecedor</p>
        <h1 className="page-heading mt-1">Equipe e veículos</h1>
        <p className="page-description">Mantenha os recursos da operação atualizados e acompanhe cada aprovação.</p>
      </header>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="surface-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-forest/10 px-5 py-4">
            <div>
              <h2 className="section-heading">Motoristas</h2>
              <p className="mt-1 text-xs text-forest/46">{drivers.length} cadastrados.</p>
            </div>
            <Users size={18} className="text-gold" aria-hidden="true" />
          </div>
          {drivers.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-forest/46">Nenhum motorista cadastrado.</p>
          ) : (
            <ul className="divide-y divide-forest/[0.075]">
              {drivers.map((driver) => (
                <li key={driver.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest/[0.07] text-xs font-semibold text-forest">
                    {driver.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-xs text-ink">{driver.name}</strong>
                    <span className="mt-1 block text-[10px] text-forest/44">{driver.phone ?? driver.email ?? "Contato não informado"}</span>
                  </span>
                  <Badge tone={approvalTone(driver.approval_status)}>{approvalLabel(driver.approval_status)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-forest/10 px-5 py-4">
            <div>
              <h2 className="section-heading">Veículos</h2>
              <p className="mt-1 text-xs text-forest/46">{vehicles.length} cadastrados.</p>
            </div>
            <CarFront size={18} className="text-gold" aria-hidden="true" />
          </div>
          {vehicles.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-forest/46">Nenhum veículo cadastrado.</p>
          ) : (
            <ul className="divide-y divide-forest/[0.075]">
              {vehicles.map((vehicle) => (
                <li key={vehicle.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest/[0.07] text-forest">
                    <CarFront size={15} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-xs text-ink">{vehicle.model}</strong>
                    <span className="mt-1 block text-[10px] text-forest/44">
                      {vehicle.plate} · {vehicle.category?.label ?? vehicle.capacity + " passageiros"}
                    </span>
                  </span>
                  <Badge tone={approvalTone(vehicle.approval_status)}>{approvalLabel(vehicle.approval_status)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Plus size={17} className="text-gold" aria-hidden="true" />
          <h2 className="section-heading">Cadastrar novo recurso</h2>
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <article className="surface-panel p-5">
            <h3 className="text-sm font-semibold text-forest">Novo motorista</h3>
            <p className="mb-4 mt-1 text-xs text-forest/46">O cadastro segue para validação da Nativos.</p>
            <DriverRegistrationForm />
          </article>
          <article className="surface-panel p-5">
            <h3 className="text-sm font-semibold text-forest">Novo veículo</h3>
            <p className="mb-4 mt-1 text-xs text-forest/46">Informe os dados operacionais do veículo.</p>
            <VehicleRegistrationForm categories={categories} />
          </article>
        </div>
      </section>
    </div>
  );
}

