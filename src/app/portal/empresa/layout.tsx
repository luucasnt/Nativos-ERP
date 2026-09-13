import { AppShell } from "@/components/brand/app-shell";
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

  const [notifications, requests, operation] = await Promise.all([
    getUnreadNotifications(user.id),
    prisma.changeRequest.count({
      where: {
        requester_type: "company",
        requester_id: company.id,
        status: { in: ["solicitada", "em_analise"] },
      },
    }),
    isSupplier
      ? prisma.service.count({
          where: {
            supplier_id: company.id,
            acceptance_status: "aguardando_aceite",
            execution_status: "agendado",
          },
        })
      : Promise.resolve(0),
  ]);

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
      nav={companyPortalNav(company.roles)}
      badges={{ solicitacoes: requests, operacao: operation }}
      notifications={<NotificationBell notifications={notifications} />}
    >
      {children}
    </AppShell>
  );
}

