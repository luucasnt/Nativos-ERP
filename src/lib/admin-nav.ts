import {
  AlertTriangle,
  Building2,
  CalendarCheck,
  Car,
  CheckCircle2,
  Inbox,
  LayoutDashboard,
  Receipt,
  Settings,
  Truck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  // Chave usada em `badges` (passado pelo layout, que consulta o Prisma)
  // pra mostrar um contador de pendência ao lado do item — ex.: "Alertas
  // (3)". Itens sem badgeKey nunca mostram contador.
  badgeKey?: "alertas" | "solicitacoes" | "despesas";
};

export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Início", icon: LayoutDashboard },
  { href: "/admin/reservas", label: "Reservas", icon: CalendarCheck },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/motoristas", label: "Motoristas", icon: Car },
  { href: "/admin/veiculos", label: "Veículos", icon: Truck },
  { href: "/admin/empresas", label: "Empresas", icon: Building2 },
  { href: "/admin/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/admin/despesas", label: "Despesas", icon: Receipt, badgeKey: "despesas" },
  { href: "/admin/solicitacoes", label: "Solicitações", icon: Inbox, badgeKey: "solicitacoes" },
  { href: "/admin/aprovacoes", label: "Aprovações", icon: CheckCircle2 },
  { href: "/admin/alertas", label: "Alertas", icon: AlertTriangle, badgeKey: "alertas" },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
];
