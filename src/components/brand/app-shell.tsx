import { Wordmark } from "@/components/brand/logo";
import { Sidebar } from "@/components/brand/sidebar";
import { Topbar } from "@/components/brand/topbar";
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
  const hasNav = !!nav && nav.length > 0;

  return (
    <div className="flex min-h-screen">
      {hasNav && (
        <aside className="flex w-[232px] shrink-0 flex-col bg-forest-900 text-white">
          <div className="border-b border-white/10 px-[22px] py-5">
            <Wordmark size={16} tone="cream-on-forest" />
          </div>
          <Sidebar
            nav={nav!.map(({ href, label, badgeKey, icon: Icon }) => ({
              href,
              label,
              badgeKey,
              icon: <Icon size={16} strokeWidth={2} aria-hidden="true" className="shrink-0" />,
            }))}
            badges={badges}
          />
          <div className="mt-auto border-t border-white/10 px-[22px] py-4 text-[11.5px] text-ink-350">
            Trancoso, Bahia
            <br />
            v1.0 · Fase 8
          </div>
        </aside>
      )}
      <main className="flex flex-1 flex-col bg-gray-50">
        <Topbar userName={userName} notifications={notifications} title={hasNav ? undefined : title} />
        <div className="flex-1 px-8 py-7 pb-12">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
    </div>
  );
}
