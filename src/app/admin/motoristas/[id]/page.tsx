import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { approveDriver, rejectDriver, updateDriver } from "../actions";
import { DriverForm } from "../driver-form";
import { PortalLoginPanel } from "@/components/admin/portal-login-panel";
import { ApprovalActions } from "@/components/admin/approval-actions";
import { DriverStatusToggle } from "../status-toggle";

export default async function EditarMotoristaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [driver, suppliers, commissionDefaults, existingUser] = await Promise.all([
    prisma.driver.findUnique({ where: { id } }),
    prisma.company.findMany({
      where: { roles: { has: "fornecedor" } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.commissionDefault.findMany({
      where: { target: "driver", active: true },
      select: { category_key: true, commission_percent: true },
    }),
    prisma.user.findFirst({ where: { linked_driver_id: id } }),
  ]);

  if (!driver) {
    notFound();
  }

  return (
    <div>
      <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <h1 className="font-serif text-3xl text-forest">Editar motorista</h1>
        {driver.approval_status === "pendente" && (
          <ApprovalActions
            onApprove={approveDriver.bind(null, id)}
            onReject={rejectDriver.bind(null, id)}
          />
        )}
      </div>

      {driver.created_from_portal && driver.approval_status === "pendente" && (
        <p className="mb-6 max-w-xl rounded-sm bg-gold/10 p-3 text-sm text-forest">
          Este cadastro foi enviado pelo fornecedor pelo portal e está
          aguardando aprovação.
        </p>
      )}

      {driver.approval_status === "aprovado" && (
        <div className="mb-6">
          <DriverStatusToggle id={driver.id} status={driver.status} />
        </div>
      )}

      <DriverForm
        action={updateDriver.bind(null, id)}
        suppliers={suppliers}
        commissionDefaults={commissionDefaults.map((d) => ({
          category_key: d.category_key,
          commission_percent: d.commission_percent.toString(),
        }))}
        defaultValues={{
          name: driver.name,
          document: driver.document,
          email: driver.email,
          phone: driver.phone,
          owner_type: driver.owner_type,
          supplier_id: driver.supplier_id,
          is_company_owner_driver: driver.is_company_owner_driver,
          payment_type: driver.payment_type,
          commission: driver.commission?.toString() ?? null,
          daily_rate: driver.daily_rate?.toString() ?? null,
          salario_mensal: driver.salario_mensal?.toString() ?? null,
          portal_email: driver.portal_email,
        }}
      />

      <div className="mt-10 max-w-2xl">
        <PortalLoginPanel
          kind="driver"
          entityId={driver.id}
          entityEmail={driver.portal_email}
          existingUserId={existingUser?.id ?? null}
          existingUserEmail={existingUser?.email ?? null}
          existingUserStatus={existingUser?.status ?? null}
        />
      </div>
    </div>
  );
}
