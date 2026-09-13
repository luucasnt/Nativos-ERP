import { redirect } from "next/navigation";
import { AppShell } from "@/components/brand/app-shell";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { ADMIN_NAV } from "@/lib/admin-nav";
import { prisma } from "@/lib/prisma";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user || user.account_type !== "internal") {
    redirect("/login");
  }

  const [alertas, solicitacoes, despesas] = await Promise.all([
    prisma.alert.count({ where: { archived: false } }),
    prisma.changeRequest.count({ where: { status: { in: ["solicitada", "em_analise"] } } }),
    prisma.serviceExpense.count({ where: { status: "pendente" } }),
  ]);

  return (
    <AppShell
      title="Painel administrativo"
      userName={user.display_name ?? user.native_name ?? user.email}
      nav={ADMIN_NAV}
      badges={{ alertas, solicitacoes, despesas }}
    >
      {children}
    </AppShell>
  );
}
