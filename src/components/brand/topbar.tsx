"use client";

import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { ADMIN_NAV } from "@/lib/admin-nav";
import { getInitials } from "@/lib/initials";

type TopbarProps = {
  userName: string;
  notifications?: React.ReactNode;
  /** Quando ausente, o breadcrumb/h1 são derivados do path atual contra
   * ADMIN_NAV (uso dentro do admin, com sidebar). Quando informado, vira
   * um topbar mais simples sem breadcrumb — uso nos portais externos,
   * que não têm uma nav de seção pra derivar. */
  title?: string;
};

function useAdminBreadcrumb() {
  const pathname = usePathname();

  if (pathname === "/admin") {
    return { breadcrumb: "Início", title: "Painel operacional" };
  }

  const match = [...ADMIN_NAV]
    .filter((item) => item.href !== "/admin" && pathname.startsWith(item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];

  const label = match?.label ?? "Painel administrativo";
  return { breadcrumb: label, title: label };
}

export function Topbar({ userName, notifications, title }: TopbarProps) {
  const derived = useAdminBreadcrumb();
  const breadcrumb = title ? undefined : derived.breadcrumb;
  const heading = title ?? derived.title;

  return (
    <div className="flex items-center justify-between border-b border-border bg-white px-8 py-4">
      <div>
        {breadcrumb && <div className="mb-1 text-xs text-ink-500">{breadcrumb}</div>}
        <h1 className="text-[19px] font-bold tracking-tight text-ink-900">{heading}</h1>
      </div>
      <div className="flex items-center gap-4">
        {notifications}
        <div className="flex items-center gap-2.5 text-[13px] font-medium text-ink-900">
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[5px] bg-forest-700 text-[11.5px] font-bold text-white">
            {getInitials(userName)}
          </span>
          {userName}
        </div>
        <form action="/logout" method="post">
          <button
            type="submit"
            aria-label="Sair"
            title="Sair"
            className="flex h-[30px] w-[30px] items-center justify-center rounded-[5px] text-ink-500 transition-colors hover:bg-gray-100 hover:text-ink-900"
          >
            <LogOut size={16} strokeWidth={2} />
          </button>
        </form>
      </div>
    </div>
  );
}
