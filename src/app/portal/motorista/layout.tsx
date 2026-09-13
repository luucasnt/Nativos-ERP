import { AppShell } from "@/components/brand/app-shell";
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

  const [notifications, requests, expenses] = await Promise.all([
    getUnreadNotifications(user.id),
    prisma.changeRequest.count({
      where: {
        requester_type: "driver",
        requester_id: driver.id,
        status: { in: ["solicitada", "em_analise"] },
      },
    }),
    prisma.serviceExpense.count({
      where: { driver_id: driver.id, status: "pendente" },
    }),
  ]);

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

