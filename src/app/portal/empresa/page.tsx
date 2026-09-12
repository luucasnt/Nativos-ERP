import { redirect } from "next/navigation";
import { AppShell } from "@/components/brand/app-shell";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export default async function PortalEmpresaHomePage() {
  const user = await getCurrentUser();

  if (!user || user.account_type !== "portal" || !user.linked_company) {
    redirect("/login");
  }

  const { linked_company: company } = user;
  const roleLabels = company.roles
    .map((role) => (role === "parceiro" ? "Parceiro" : "Fornecedor"))
    .join(" · ");

  return (
    <AppShell
      title="Portal do parceiro / fornecedor"
      userName={user.display_name ?? company.name}
    >
      <h1 className="font-serif text-3xl text-forest">{company.name}</h1>
      <p className="mt-2 text-forest/70">{roleLabels}</p>
      <p className="mt-8 max-w-2xl text-sm text-forest/60">
        Esta é a base do portal externo (Fase 1 — Fundação). Reservas,
        faturamento e solicitações de alteração serão adicionados na Fase 5
        do plano de construção.
      </p>
    </AppShell>
  );
}
