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
  badgeKey?: "alertas" | "solicitacoes" | "despesas" | "operacao";
};

export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Início", icon: "home" },
  { href: "/admin/reservas", label: "Reservas", icon: "calendar" },
  { href: "/admin/clientes", label: "Clientes", icon: "users" },
  { href: "/admin/motoristas", label: "Motoristas", icon: "driver" },
  { href: "/admin/veiculos", label: "Veículos", icon: "vehicle" },
  { href: "/admin/empresas", label: "Empresas", icon: "building" },
  { href: "/admin/financeiro", label: "Financeiro", icon: "finance" },
  { href: "/admin/relatorios", label: "Relatórios", icon: "documents" },
  { href: "/admin/despesas", label: "Despesas", icon: "receipt", badgeKey: "despesas" },
  { href: "/admin/solicitacoes", label: "Solicitações", icon: "requests", badgeKey: "solicitacoes" },
  { href: "/admin/aprovacoes", label: "Aprovações", icon: "approvals" },
  { href: "/admin/alertas", label: "Alertas", icon: "alerts", badgeKey: "alertas" },
  { href: "/admin/documentos", label: "Documentos", icon: "documents" },
  { href: "/admin/configuracoes", label: "Configurações", icon: "settings" },
];
