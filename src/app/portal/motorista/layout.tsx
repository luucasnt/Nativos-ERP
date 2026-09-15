import { AppShell } from "@/components/brand/app-shell";
import { Prisma } from "@prisma/client";
import { NotificationBell } from "@/components/portal/notification-bell";
import { requireDriverPortalUser } from "@/lib/auth/get-current-user";
import { getUnreadNotifications } from "@/lib/notifications";
import { companyPortalNav, DRIVER_PORTAL_NAV } from "@/lib/portal-nav";
import { prisma } from "@/lib/prisma";

export default async function PortalMotoristaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireDriverPortalUser();
  const driver = user.linked_driver;
  const company = user.linked_company;

  const [notifications, badgeRows] = await Promise.all([
    getUnreadNotifications(user.id),
    prisma.$queryRaw<Array<{
      driver_requests: number;
      company_requests: number;
      expenses: number;
      operation: number;
    }>>(Prisma.sql`
      SELECT
        (SELECT COUNT(*)::integer FROM "public"."change_requests"
          WHERE "requester_type" = 'driver'
            AND "requester_id" = CAST(${driver.id} AS uuid)
            AND "status" IN ('solicitada', 'em_analise')) AS "driver_requests",
        (SELECT COUNT(*)::integer FROM "public"."change_requests"
          WHERE "requester_type" = 'company'
            AND "requester_id" = CAST(${user.linked_company_id} AS uuid)
            AND "status" IN ('solicitada', 'em_analise')) AS "company_requests",
        (SELECT COUNT(*)::integer FROM "public"."service_expenses"
          WHERE "driver_id" = CAST(${driver.id} AS uuid)
            AND "status" = 'pendente') AS "expenses",
        (SELECT COUNT(*)::integer FROM "public"."services"
          WHERE "supplier_id" = CAST(${user.linked_company_id} AS uuid)
            AND "acceptance_status" = 'aguardando_aceite'
            AND "execution_status" = 'agendado') AS "operation"
    `),
  ]);
  const counts = badgeRows[0] ?? {
    driver_requests: 0,
    company_requests: 0,
    expenses: 0,
    operation: 0,
  };
  const integratedPortal = Boolean(company);
  const nav = company
    ? companyPortalNav(company.roles, true)
    : DRIVER_PORTAL_NAV;

  return (
    <AppShell
      title={integratedPortal ? "Portal integrado" : "Portal do motorista"}
      userName={user.display_name ?? driver.name}
      nav={nav}
      badges={{
        solicitacoes: integratedPortal ? counts.company_requests : counts.driver_requests,
        despesas: counts.expenses,
        operacao: counts.operation,
      }}
      notifications={<NotificationBell notifications={notifications} />}
      mobileNav="bottom"
    >
      {children}
    </AppShell>
  );
}
