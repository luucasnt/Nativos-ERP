export type NavIconName =
  | "home"
  | "calendar"
  | "users"
  | "driver"
  | "vehicle"
  | "building"
  | "finance"
  | "receipt"
  | "requests"
  | "approvals"
  | "alerts"
  | "settings"
  | "briefcase"
  | "documents"
  | "team"
  | "support";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: NavIconName;
  section?: string;
  mobilePrimary?: boolean;
  badgeKey?: "alertas" | "solicitacoes" | "despesas" | "operacao";
};

export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Início", icon: "home", section: "Visão geral", mobilePrimary: true },
  { href: "/admin/reservas", label: "Reservas", icon: "calendar", section: "Operação", mobilePrimary: true },
  { href: "/admin/solicitacoes", label: "Solicitações", icon: "requests", section: "Operação", badgeKey: "solicitacoes", mobilePrimary: true },
  { href: "/admin/aprovacoes", label: "Aprovações", icon: "approvals", section: "Operação" },
  { href: "/admin/alertas", label: "Alertas", icon: "alerts", section: "Operação", badgeKey: "alertas" },
  { href: "/admin/clientes", label: "Clientes", icon: "users", section: "Cadastros" },
  { href: "/admin/motoristas", label: "Motoristas", icon: "driver", section: "Cadastros" },
  { href: "/admin/veiculos", label: "Veículos", icon: "vehicle", section: "Cadastros" },
  { href: "/admin/empresas", label: "Empresas", icon: "building", section: "Cadastros" },
  { href: "/admin/financeiro", label: "Financeiro", icon: "finance", section: "Gestão", mobilePrimary: true },
  { href: "/admin/despesas", label: "Despesas", icon: "receipt", section: "Gestão", badgeKey: "despesas" },
  { href: "/admin/relatorios", label: "Relatórios", icon: "documents", section: "Gestão" },
  { href: "/admin/configuracoes", label: "Configurações", icon: "settings", section: "Sistema" },
];
