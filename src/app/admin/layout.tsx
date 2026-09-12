import { redirect } from "next/navigation";
import { AppShell } from "@/components/brand/app-shell";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { ADMIN_NAV } from "@/lib/admin-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user || user.account_type !== "internal") {
    redirect("/login");
  }

  return (
    <AppShell
      title="Painel administrativo"
      userName={user.display_name ?? user.native_name ?? user.email}
      nav={ADMIN_NAV}
    >
      {children}
    </AppShell>
  );
}
