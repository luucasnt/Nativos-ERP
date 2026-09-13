import { Wordmark } from "@/components/brand/logo";
import { Sidebar } from "@/components/brand/sidebar";
import { PageTransition } from "@/components/ui/page-transition";
import type { AdminNavItem } from "@/lib/admin-nav";

type AppShellProps = {
  title: string;
  userName: string;
  nav?: AdminNavItem[];
  badges?: Partial<Record<NonNullable<AdminNavItem["badgeKey"]>, number>>;
  notifications?: React.ReactNode;
  children: React.ReactNode;
};

export function AppShell({
  title,
  userName,
  nav,
  badges,
  notifications,
  children,
}: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-forest/10 bg-forest px-6 py-4 text-cream">
        <div className="flex items-center gap-4">
          <Wordmark size={22} tone="cream-on-forest" />
          <span className="h-5 w-px bg-cream/30" aria-hidden="true" />
          <span className="font-serif text-lg tracking-wide">{title}</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          {notifications}
          <span className="text-cream/80">{userName}</span>
          <form action="/logout" method="post">
            <button
              type="submit"
              className="rounded-sm border border-gold/40 px-3 py-1 text-gold transition hover:bg-gold hover:text-forest"
            >
              Sair
            </button>
          </form>
        </div>
      </header>
      <div className="flex flex-1">
        {nav && nav.length > 0 && <Sidebar nav={nav} badges={badges} />}
        <main className="flex-1 bg-cream px-6 py-10">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
