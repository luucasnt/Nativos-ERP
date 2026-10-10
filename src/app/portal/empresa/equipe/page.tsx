import { SupplierDriverAccessForm } from "@/components/portal/supplier-workflow-forms";
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

  const accesses = await prisma.user.findMany({ where: { linked_driver_id: { in: drivers.map(d => d.id) } }, select: { linked_driver_id: true, status: true } });
  const requests = await prisma.changeRequest.findMany({ where: { company_id: company.id, type: "acesso_motorista" }, orderBy: { created_at: "desc" }, select: { protocol: true, status: true, allocation_details: true } });
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
              <p className="mt-1 text-xs text-forest/58">{drivers.length} cadastrados.</p>
            </div>
            <Users size={18} className="text-gold" aria-hidden="true" />
          </div>
          {drivers.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-forest/58">Nenhum motorista cadastrado.</p>
          ) : (
            <ul className="divide-y divide-forest/[0.075]">
              {drivers.map((driver) => (
                <li key={driver.id}><div className="flex items-center gap-3 px-5 py-3.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest/[0.07] text-xs font-semibold text-forest">
                    {driver.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-xs text-ink">{driver.name}</strong>
                    <span className="mt-1 block text-[11px] text-forest/55">{driver.phone ?? driver.email ?? "Contato não informado"}</span>
                  </span>
                  <Badge tone={approvalTone(driver.approval_status)}>{approvalLabel(driver.approval_status)}</Badge></div>
                  {(() => { const access = accesses.find(a => a.linked_driver_id === driver.id); const request = requests.find(r => r.allocation_details && typeof r.allocation_details === "object" && !Array.isArray(r.allocation_details) && r.allocation_details.driver_id === driver.id); if (access) return <p className="px-5 pb-3 text-xs text-forest/70">Acesso ao portal: {access.status === "ativo" ? "ativo" : "inativo (contate a Nativos)"}</p>; if (request && ["solicitada", "em_analise", "aprovada"].includes(request.status)) return <p className="px-5 pb-3 text-xs text-forest/70">Acesso em análise · {request.protocol}</p>; return driver.status === "ativo" && driver.approval_status === "aprovado" ? <SupplierDriverAccessForm driverId={driver.id} email={driver.portal_email ?? driver.email} dedupeKey={crypto.randomUUID()} /> : null; })()}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-forest/10 px-5 py-4">
            <div>
              <h2 className="section-heading">Veículos</h2>
              <p className="mt-1 text-xs text-forest/58">{vehicles.length} cadastrados.</p>
            </div>
            <CarFront size={18} className="text-gold" aria-hidden="true" />
          </div>
          {vehicles.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-forest/58">Nenhum veículo cadastrado.</p>
          ) : (
            <ul className="divide-y divide-forest/[0.075]">
              {vehicles.map((vehicle) => (
                <li key={vehicle.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest/[0.07] text-forest">
                    <CarFront size={15} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-xs text-ink">{vehicle.model}</strong>
                    <span className="mt-1 block text-[11px] text-forest/55">
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
            <p className="mb-4 mt-1 text-xs text-forest/58">O cadastro segue para validação da Nativos.</p>
            <DriverRegistrationForm />
          </article>
          <article className="surface-panel p-5">
            <h3 className="text-sm font-semibold text-forest">Novo veículo</h3>
            <p className="mb-4 mt-1 text-xs text-forest/58">Informe os dados operacionais do veículo.</p>
            <VehicleRegistrationForm categories={categories} />
          </article>
        </div>
      </section>
    </div>
  );
}

