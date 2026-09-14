import { AppShell } from "@/components/brand/app-shell";
import { Prisma } from "@prisma/client";
import { NotificationBell } from "@/components/portal/notification-bell";
import { requireCompanyPortalUser } from "@/lib/auth/get-current-user";
import { getUnreadNotifications } from "@/lib/notifications";
import { companyPortalNav } from "@/lib/portal-nav";
import { prisma } from "@/lib/prisma";

export default async function PortalEmpresaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireCompanyPortalUser();
  const company = user.linked_company;
  const isSupplier = company.roles.includes("fornecedor");

  const [notifications, badgeRows] = await Promise.all([
    getUnreadNotifications(user.id),
    prisma.$queryRaw<Array<{ requests: number; operation: number }>>(Prisma.sql`
      SELECT
        (SELECT COUNT(*)::integer FROM "public"."change_requests"
          WHERE "requester_type" = 'company'
            AND "requester_id" = CAST(${company.id} AS uuid)
            AND "status" IN ('solicitada', 'em_analise')) AS "requests",
        (SELECT COUNT(*)::integer FROM "public"."services"
          WHERE "supplier_id" = CAST(${company.id} AS uuid)
            AND "acceptance_status" = 'aguardando_aceite'
            AND "execution_status" = 'agendado') AS "operation"
    `),
  ]);
  const { requests, operation: supplierOperation } = badgeRows[0] ?? { requests: 0, operation: 0 };
  const operation = isSupplier ? supplierOperation : 0;

  const portalTitle =
    company.roles.length > 1
      ? "Portal da empresa"
      : company.roles[0] === "fornecedor"
        ? "Portal do fornecedor"
        : "Portal do parceiro";

  return (
    <AppShell
      title={portalTitle}
      userName={user.display_name ?? company.name}
      nav={companyPortalNav(company.roles, Boolean(user.linked_driver_id))}
      badges={{ solicitacoes: requests, operacao: operation }}
      notifications={<NotificationBell notifications={notifications} />}
    >
      {children}
    </AppShell>
  );
}
