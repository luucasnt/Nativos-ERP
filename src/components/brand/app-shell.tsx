import { LogOut } from "lucide-react";
import { Wordmark } from "@/components/brand/logo";
import {
  MobileBottomNavigation,
  MobileNavigation,
  Sidebar,
} from "@/components/brand/sidebar";
import { NavigationSearch } from "@/components/brand/navigation-search";
import { PageTransition } from "@/components/ui/page-transition";
import type { AdminNavItem } from "@/lib/admin-nav";

type AppShellProps = {
  title: string;
  userName: string;
  nav?: AdminNavItem[];
  badges?: Partial<Record<NonNullable<AdminNavItem["badgeKey"]>, number>>;
  notifications?: React.ReactNode;
  mobileNav?: "drawer" | "bottom";
  children: React.ReactNode;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "N";
  return `${parts[0][0] ?? ""}${parts.at(-1)?.[0] ?? ""}`.toUpperCase();
}
export function AppShell({
  title,
  userName,
  nav = [],
  badges,
  notifications,
  mobileNav = "drawer",
  children,
}: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-cream">
      {nav.length > 0 && <Sidebar nav={nav} badges={badges} />}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 flex h-[calc(4rem+env(safe-area-inset-top))] items-center gap-3 border-b border-forest/10 bg-white/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur md:h-16 md:px-6 md:pt-0">
          <div className="flex min-w-0 items-center gap-3 md:hidden">
            {nav.length > 0 && <MobileNavigation nav={nav} badges={badges} />}
            <Wordmark size={20} tone="forest-on-cream" priority />
          </div>

          <div className="hidden min-w-0 md:block">
            <p className="truncate text-sm font-semibold text-forest">
              {title}
            </p>
            <p className="text-[10px] uppercase tracking-[0.14em] text-forest/38">
              Nativos ERP
            </p>
          </div>

          <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 md:gap-3">
            {nav.length > 0 && (
              <div className="mr-auto hidden w-full justify-center px-5 md:flex">
                <NavigationSearch
                  items={nav.map(({ href, label }) => ({ href, label }))}
                />
              </div>
            )}
            {notifications}
            <div className="hidden items-center gap-2.5 border-l border-forest/10 pl-3 sm:flex">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest text-[11px] font-semibold text-cream">
                {initials(userName)}
              </span>
              <span className="max-w-32 truncate text-xs font-medium text-forest">
                {userName}
              </span>
            </div>
            <form action="/logout" method="post">
              <button
                type="submit"
                title="Sair do sistema"
                aria-label="Sair do sistema"
                className="focus-ring inline-flex h-11 w-11 items-center justify-center gap-2 rounded-lg border border-forest/12 bg-white px-2.5 text-xs font-medium text-forest/62 transition hover:border-forest/25 hover:text-forest md:h-9 md:w-auto"
              >
                <LogOut size={15} aria-hidden="true" />
                <span className="hidden xl:inline">Sair</span>
              </button>
            </form>
          </div>
        </header>

        <main
          className={`min-w-0 px-3 py-4 sm:px-4 sm:py-6 md:px-7 md:py-7 xl:px-9 ${mobileNav === "bottom" ? "pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-8" : ""}`}
        >
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      {nav.length > 0 && mobileNav === "bottom" && (
        <MobileBottomNavigation nav={nav} badges={badges} />
      )}
    </div>
  );
}
