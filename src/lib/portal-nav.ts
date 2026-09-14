import type { CompanyRoleType } from "@prisma/client";
import type { AdminNavItem } from "@/lib/admin-nav";

export function companyPortalNav(
  roles: CompanyRoleType[],
  hasLinkedDriver = false,
): AdminNavItem[] {
  const isPartner = roles.includes("parceiro");
  const isSupplier = roles.includes("fornecedor");

  return [
    { href: "/portal/empresa", label: "Início", icon: "home" },
    ...(isPartner
      ? [
          { href: "/portal/empresa/reservas", label: "Reservas", icon: "calendar" as const },
          { href: "/portal/empresa/relatorios", label: "Relatórios", icon: "documents" as const },
          { href: "/portal/empresa/guia", label: "Categorias e veículos", icon: "vehicle" as const },
        ]
      : []),
    ...(isSupplier
      ? [
          {
            href: "/portal/empresa/operacao",
            label: "Minha operação",
            icon: "briefcase" as const,
            badgeKey: "operacao" as const,
          },
          { href: "/portal/empresa/equipe", label: "Equipe e veículos", icon: "team" as const },
        ]
      : []),
    ...(hasLinkedDriver
      ? [
          {
            href: "/portal/motorista/servicos",
            label: "Minha agenda",
            icon: "calendar" as const,
          },
          {
            href: "/portal/motorista/financeiro",
            label: "Meus repasses",
            icon: "finance" as const,
          },
        ]
      : []),
    {
      href: "/portal/empresa/solicitacoes",
      label: "Solicitações",
      icon: "requests",
      badgeKey: "solicitacoes",
    },
    { href: "/portal/empresa/financeiro", label: "Financeiro", icon: "finance" },
  ];
}

export const DRIVER_PORTAL_NAV: AdminNavItem[] = [
  { href: "/portal/motorista", label: "Início", icon: "home" },
  { href: "/portal/motorista/servicos", label: "Agenda", icon: "calendar" },
  { href: "/portal/motorista/producao", label: "Produção", icon: "briefcase" },
  { href: "/portal/motorista/despesas", label: "Despesas", icon: "receipt", badgeKey: "despesas" },
  { href: "/portal/motorista/financeiro", label: "Financeiro", icon: "finance" },
  {
    href: "/portal/motorista/solicitacoes",
    label: "Solicitações",
    icon: "requests",
    badgeKey: "solicitacoes",
  },
];
