import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { AppShell } from "@/components/brand/app-shell";
import { canAccessFinance, getCurrentUser } from "@/lib/auth/get-current-user";
import { ADMIN_NAV } from "@/lib/admin-nav";
import { prisma } from "@/lib/prisma";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user || user.account_type !== "internal" || user.status !== "ativo") {
    redirect("/login");
  }

  const nav = canAccessFinance(user)
    ? ADMIN_NAV
    : ADMIN_NAV.filter((item) => !["/admin/financeiro", "/admin/despesas"].includes(item.href));

  const badgeRows = await prisma.$queryRaw<Array<{ alertas: number; solicitacoes: number; despesas: number }>>(Prisma.sql`
    SELECT
      (SELECT COUNT(*)::integer FROM "public"."alerts" WHERE "archived" = false) AS "alertas",
      (SELECT COUNT(*)::integer FROM "public"."change_requests" WHERE "status" IN ('solicitada', 'em_analise')) AS "solicitacoes",
      (SELECT COUNT(*)::integer FROM "public"."service_expenses" WHERE "status" = 'pendente') AS "despesas"
  `);
  const { alertas, solicitacoes, despesas } = badgeRows[0] ?? {
    alertas: 0,
    solicitacoes: 0,
    despesas: 0,
  };

  return (
    <AppShell
      title="Painel administrativo"
      userName={user.display_name ?? user.native_name ?? user.email}
      nav={nav}
      badges={{ alertas, solicitacoes, despesas }}
    >
      {children}
    </AppShell>
  );
}
