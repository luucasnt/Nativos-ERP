import type { CompanyRoleType } from "@prisma/client";
import type { AdminNavItem } from "@/lib/admin-nav";

export function companyPortalNav(
  roles: CompanyRoleType[],
  hasLinkedDriver = false,
): AdminNavItem[] {
  const isPartner = roles.includes("parceiro");
  const isSupplier = roles.includes("fornecedor");

  return [
    { href: "/portal/empresa", label: "Início", icon: "home", section: "Visão geral", mobilePrimary: true },
    ...(isPartner
      ? [
          { href: "/portal/empresa/reservas", label: "Reservas", icon: "calendar" as const, section: "Cliente parceiro", mobilePrimary: !hasLinkedDriver || !isSupplier },
          { href: "/portal/empresa/relatorios", label: "Relatórios", icon: "documents" as const, section: "Cliente parceiro" },
          { href: "/portal/empresa/guia", label: "Categorias e veículos", icon: "vehicle" as const, section: "Cliente parceiro" },
        ]
      : []),
    ...(isSupplier
      ? [
          {
            href: "/portal/empresa/operacao",
            label: "Minha operação",
            icon: "briefcase" as const,
            section: "Fornecedor",
            badgeKey: "operacao" as const,
            mobilePrimary: true,
          },
          { href: "/portal/empresa/equipe", label: "Equipe e veículos", icon: "team" as const, section: "Fornecedor" },
        ]
      : []),
    { href: "/portal/empresa/financeiro", label: "Financeiro", icon: "finance", section: "Gestão", mobilePrimary: true },
    {
      href: "/portal/empresa/solicitacoes",
      label: "Solicitações",
      icon: "requests",
      section: "Gestão",
      badgeKey: "solicitacoes",
      mobilePrimary: !hasLinkedDriver,
    },
    ...(hasLinkedDriver
      ? [
          {
            href: "/portal/motorista",
            label: "Painel do motorista",
            icon: "home" as const,
            section: "Como motorista",
          },
          {
            href: "/portal/motorista/servicos",
            label: "Minha agenda",
            icon: "calendar" as const,
            section: "Como motorista",
            mobilePrimary: true,
          },
          {
            href: "/portal/motorista/producao",
            label: "Minha produção",
            icon: "briefcase" as const,
            section: "Como motorista",
          },
          {
            href: "/portal/motorista/despesas",
            label: "Minhas despesas",
            icon: "receipt" as const,
            section: "Como motorista",
          },
          {
            href: "/portal/motorista/financeiro",
            label: "Meus ganhos",
            icon: "finance" as const,
            section: "Como motorista",
          },
          {
            href: "/portal/motorista/solicitacoes",
            label: "Solicitações pessoais",
            icon: "requests" as const,
            section: "Como motorista",
          },
        ]
      : []),
  ];
}

export const DRIVER_PORTAL_NAV: AdminNavItem[] = [
  { href: "/portal/motorista", label: "Início", icon: "home", section: "Hoje", mobilePrimary: true },
  { href: "/portal/motorista/servicos", label: "Agenda", icon: "calendar", section: "Hoje", mobilePrimary: true },
  { href: "/portal/motorista/producao", label: "Produção", icon: "briefcase", section: "Meu trabalho" },
  { href: "/portal/motorista/despesas", label: "Despesas", icon: "receipt", section: "Meu trabalho", mobilePrimary: true, badgeKey: "despesas" },
  { href: "/portal/motorista/financeiro", label: "Financeiro", icon: "finance", section: "Meu trabalho", mobilePrimary: true },
  {
    href: "/portal/motorista/solicitacoes",
    label: "Solicitações",
    icon: "requests",
    section: "Suporte",
    badgeKey: "solicitacoes",
  },
];
