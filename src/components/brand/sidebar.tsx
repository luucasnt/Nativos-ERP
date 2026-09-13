"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminNavItem } from "@/lib/admin-nav";

// `icon` chega já renderizado (JSX), não como referência de componente —
// uma função de componente (o que `item.icon` seria, cru) não pode
// atravessar a fronteira Server → Client Component como valor de prop
// (só dado serializável ou elementos React já instanciados podem). Quem
// monta esse array é o AppShell (Server Component), via
// `renderNavIcon()` abaixo.
type SidebarNavItem = Pick<AdminNavItem, "href" | "label" | "badgeKey"> & {
  icon: React.ReactNode;
};

type SidebarProps = {
  nav: SidebarNavItem[];
  badges?: Partial<Record<NonNullable<AdminNavItem["badgeKey"]>, number>>;
};

// Item ativo = o próprio path ou um path filho (ex.: /admin/reservas/123
// mantém "Reservas" destacado) — exceto "/admin" em si, que só fica ativo
// na home exata (senão ficaria sempre destacado, já que é prefixo de
// tudo).
function isActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ nav, badges = {} }: SidebarProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-px px-3 py-2.5">
      {nav.map((item) => {
        const active = isActive(pathname, item.href);
        const count = item.badgeKey ? badges[item.badgeKey] : undefined;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-[11px] rounded-[5px] px-3 py-[9px] text-[13px] font-medium transition-colors ${
              active ? "bg-forest-700 text-white" : "text-sage-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            {item.icon}
            <span className="flex-1 truncate">{item.label}</span>
            {!!count && count > 0 && (
              <span className="rounded-[3px] bg-gold-500 px-1.5 py-px text-[10.5px] font-bold text-forest-900">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
