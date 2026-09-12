import { redirect } from "next/navigation";
import { AppShell } from "@/components/brand/app-shell";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export default async function AdminHomePage() {
  const user = await getCurrentUser();

  if (!user || user.account_type !== "internal") {
    redirect("/login");
  }

  return (
    <AppShell
      title="Painel administrativo"
      userName={user.display_name ?? user.native_name ?? user.email}
    >
      <h1 className="font-serif text-3xl text-forest">
        Bem-vindo(a), {user.display_name ?? user.native_name ?? user.email}
      </h1>
      <p className="mt-2 text-forest/70">
        Perfil interno:{" "}
        {user.is_owner
          ? "proprietário(a) do sistema"
          : (user.internal_role ?? "—")}
      </p>
      <p className="mt-8 max-w-2xl text-sm text-forest/60">
        Esta é a base do painel administrativo (Fase 1 — Fundação). Os
        módulos de cadastro, operação e financeiro serão adicionados nas
        próximas fases do plano de construção.
      </p>
    </AppShell>
  );
}
