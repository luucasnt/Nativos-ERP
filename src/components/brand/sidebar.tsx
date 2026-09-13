"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminNavItem } from "@/lib/admin-nav";

type SidebarProps = {
  nav: AdminNavItem[];
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
    <nav className="flex w-60 shrink-0 flex-col bg-forest-dark px-3 py-6">
      <ul className="flex flex-1 flex-col gap-0.5">
        {nav.map((item) => {
          const active = isActive(pathname, item.href);
          const count = item.badgeKey ? badges[item.badgeKey] : undefined;
          const Icon = item.icon;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-cream/10 font-medium text-cream"
                    : "text-cream/55 hover:bg-cream/5 hover:text-cream/85"
                }`}
              >
                <Icon size={17} strokeWidth={2} aria-hidden="true" className="shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
                {!!count && count > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1.5 text-[11px] font-semibold text-forest-dark">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
