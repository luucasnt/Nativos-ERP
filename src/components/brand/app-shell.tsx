import { LogOut } from "lucide-react";
import { Wordmark } from "@/components/brand/logo";
import {
  MobileBottomNavigation,
  MobileNavigation,
  Sidebar,
} from "@/components/brand/sidebar";
import { NavigationSearch } from "@/components/brand/navigation-search";
import { NavigationBackButton } from "@/components/brand/navigation-back-button";
import { PageTransition } from "@/components/ui/page-transition";
import type { AdminNavItem } from "@/lib/admin-nav";

type AppShellProps = {
  title: string;
  userName: string;
  nav?: AdminNavItem[];
  badges?: Partial<Record<NonNullable<AdminNavItem["badgeKey"]>, number>>;
  notifications?: React.ReactNode;
  mobileNav?: "drawer" | "bottom";
  entitySearch?: boolean;
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
  entitySearch = false,
  children,
}: AppShellProps) {
  return (
    <div className="flex min-h-dvh max-w-full overflow-x-clip bg-cream">
      {nav.length > 0 && <Sidebar nav={nav} badges={badges} />}

      <div className="w-full min-w-0 flex-1">
        <header className="sticky top-0 z-40 flex h-[calc(4rem+env(safe-area-inset-top))] max-w-full items-center gap-3 border-b border-forest/10 bg-white/95 px-3 pt-[env(safe-area-inset-top)] backdrop-blur sm:px-4 xl:h-16 xl:px-6 xl:pt-0">
          {nav.length > 0 && (
            <NavigationBackButton
              homeHref={nav[0]?.href ?? "/"}
              sectionHrefs={nav.map((item) => item.href)}
            />
          )}

          <div className="flex min-w-0 items-center gap-3 xl:hidden">
            {nav.length > 0 && mobileNav === "drawer" && (
              <MobileNavigation nav={nav} badges={badges} userName={userName} />
            )}
            <Wordmark size={20} tone="forest-on-cream" priority />
          </div>

          <div className="hidden min-w-0 xl:block">
            <p className="truncate text-sm font-semibold text-forest">
              {title}
            </p>
            <p className="text-[11px] uppercase tracking-[0.14em] text-forest/38">
              Nativos ERP
            </p>
          </div>

          <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 xl:gap-3">
            {nav.length > 0 && (
              <div className="mr-auto flex min-w-0 justify-end xl:w-full xl:justify-center xl:px-5">
                <NavigationSearch
                  items={nav.map(({ href, label }) => ({ href, label }))}
                  entitySearch={entitySearch}
                />
              </div>
            )}
            {notifications}
            <div className="hidden items-center gap-2.5 border-l border-forest/10 pl-3 xl:flex">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest text-[11px] font-semibold text-cream">
                {initials(userName)}
              </span>
              <span className="max-w-32 truncate text-xs font-medium text-forest">
                {userName}
              </span>
            </div>
            <form action="/logout" method="post" className={nav.length > 0 ? "hidden xl:block" : "block"}>
              <button
                type="submit"
                title="Sair do sistema"
                aria-label="Sair do sistema"
                className="focus-ring inline-flex h-11 w-11 items-center justify-center gap-2 rounded-lg border border-forest/12 bg-white px-2.5 text-xs font-medium text-forest/62 transition hover:border-forest/25 hover:text-forest xl:h-9 xl:w-auto"
              >
                <LogOut size={15} aria-hidden="true" />
                <span className="hidden xl:inline">Sair</span>
              </button>
            </form>
          </div>
        </header>

        <main
          className={`w-full min-w-0 max-w-full overflow-x-clip px-3 py-4 sm:px-4 sm:py-6 lg:px-7 lg:py-7 xl:px-9 ${mobileNav === "bottom" ? "pb-[calc(6rem+env(safe-area-inset-bottom))] xl:pb-8" : ""}`}
        >
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      {nav.length > 0 && mobileNav === "bottom" && (
        <MobileBottomNavigation nav={nav} badges={badges} userName={userName} />
      )}
    </div>
  );
}
