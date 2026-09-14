import { AppShell } from "@/components/brand/app-shell";
import { Prisma } from "@prisma/client";
import { NotificationBell } from "@/components/portal/notification-bell";
import { requireDriverPortalUser } from "@/lib/auth/get-current-user";
import { getUnreadNotifications } from "@/lib/notifications";
import { DRIVER_PORTAL_NAV } from "@/lib/portal-nav";
import { prisma } from "@/lib/prisma";

export default async function PortalMotoristaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireDriverPortalUser();
  const driver = user.linked_driver;

  const [notifications, badgeRows] = await Promise.all([
    getUnreadNotifications(user.id),
    prisma.$queryRaw<Array<{ requests: number; expenses: number }>>(Prisma.sql`
      SELECT
        (SELECT COUNT(*)::integer FROM "public"."change_requests"
          WHERE "requester_type" = 'driver'
            AND "requester_id" = CAST(${driver.id} AS uuid)
            AND "status" IN ('solicitada', 'em_analise')) AS "requests",
        (SELECT COUNT(*)::integer FROM "public"."service_expenses"
          WHERE "driver_id" = CAST(${driver.id} AS uuid)
            AND "status" = 'pendente') AS "expenses"
    `),
  ]);
  const { requests, expenses } = badgeRows[0] ?? { requests: 0, expenses: 0 };

  return (
    <AppShell
      title="Portal do motorista"
      userName={user.display_name ?? driver.name}
      nav={DRIVER_PORTAL_NAV}
      badges={{ solicitacoes: requests, despesas: expenses }}
      notifications={<NotificationBell notifications={notifications} />}
      mobileNav="bottom"
    >
      {children}
    </AppShell>
  );
}
