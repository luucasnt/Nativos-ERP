import { redirect } from "next/navigation";
import { AppShell } from "@/components/brand/app-shell";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export default async function PortalMotoristaHomePage() {
  const user = await getCurrentUser();

  if (!user || user.account_type !== "portal" || !user.linked_driver) {
    redirect("/login");
  }

  const { linked_driver: driver } = user;

  return (
    <AppShell
      title="Portal do motorista"
      userName={user.display_name ?? driver.name}
    >
      <h1 className="font-serif text-3xl text-forest">{driver.name}</h1>
      <p className="mt-2 text-forest/70">
        {driver.owner_type === "proprio" ? "Frota própria" : "Terceirizado"}
      </p>
      <p className="mt-8 max-w-2xl text-sm text-forest/60">
        Esta é a base do portal externo (Fase 1 — Fundação). Serviços
        atribuídos, despesas e confirmação de execução serão adicionados na
        Fase 5 do plano de construção.
      </p>
    </AppShell>
  );
}
