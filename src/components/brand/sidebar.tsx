"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CarFront,
  FileText,
  Gauge,
  Headphones,
  Inbox,
  LogOut,
  Menu,
  ReceiptText,
  Settings,
  UserRoundCheck,
  Users,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";
import { Wordmark } from "@/components/brand/logo";
import type { AdminNavItem, NavIconName } from "@/lib/admin-nav";

type SidebarProps = {
  nav: AdminNavItem[];
  badges?: Partial<Record<NonNullable<AdminNavItem["badgeKey"]>, number>>;
};

const ICONS: Record<NavIconName, LucideIcon> = {
  home: Gauge,
  calendar: CalendarDays,
  users: Users,
  driver: UserRoundCheck,
  vehicle: CarFront,
  building: Building2,
  finance: WalletCards,
  receipt: ReceiptText,
  requests: Inbox,
  approvals: BadgeCheck,
  alerts: AlertTriangle,
  settings: Settings,
  briefcase: BriefcaseBusiness,
  documents: FileText,
  team: Users,
  support: Headphones,
};

function isActive(pathname: string, item: AdminNavItem) {
  if (item.icon === "home") {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
function NavigationList({
  nav,
  badges,
  onNavigate,
}: SidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <ul className="grid gap-1">
      {nav.map((item) => {
        const active = isActive(pathname, item);
        const count = item.badgeKey ? badges?.[item.badgeKey] : undefined;
        const Icon = ICONS[item.icon];

        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`focus-ring group relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition ${
                active
                  ? "bg-white/[0.10] font-medium text-white"
                  : "text-cream/62 hover:bg-white/[0.055] hover:text-white"
              }`}
            >
              {active && (
                <span
                  className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-gold"
                  aria-hidden="true"
                />
              )}
              <Icon
                size={17}
                strokeWidth={active ? 2.2 : 1.8}
                aria-hidden="true"
                className={
                  active ? "text-gold" : "text-cream/55 group-hover:text-cream"
                }
              />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {!!count && count > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1.5 text-[10px] font-semibold text-forest-dark">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function Sidebar({ nav, badges = {} }: SidebarProps) {
  return (
    <aside className="sticky top-0 hidden h-screen w-[236px] shrink-0 flex-col bg-forest px-3 py-5 text-cream md:flex">
      <Link
        href={nav[0]?.href ?? "/"}
        className="focus-ring mx-3 inline-flex rounded"
      >
        <Wordmark size={27} tone="cream-on-forest" priority />
      </Link>
      <p className="mx-3 mt-2 text-[9px] font-medium uppercase tracking-[0.19em] text-cream/38">
        Gestão profissional
      </p>

      <nav
        aria-label="Navegação principal"
        className="mt-8 min-h-0 flex-1 overflow-y-auto pr-1"
      >
        <NavigationList nav={nav} badges={badges} />
      </nav>

      <div className="mx-3 mt-5 border-t border-white/10 pt-4">
        <div className="flex items-center gap-2 text-[11px] text-cream/48">
          <span
            className="h-1.5 w-1.5 rounded-full bg-[#6dc18f]"
            aria-hidden="true"
          />
          Sistema operacional
        </div>
        <p className="mt-1 text-[10px] text-cream/28">Nativos ERP</p>
      </div>
    </aside>
  );
}

export function MobileNavigation({ nav, badges = {} }: SidebarProps) {
  const [open, setOpen] = useState(false);
  const drawerId = useId();

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
        aria-expanded={open}
        aria-controls={drawerId}
        className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-xl border border-forest/12 bg-white text-forest shadow-[0_1px_2px_rgba(23,41,35,0.04)]"
      >
        <Menu size={21} aria-hidden="true" />
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[100] md:hidden">
            <button
              type="button"
              aria-label="Fechar menu"
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-forest-dark/55 backdrop-blur-[2px]"
            />
            <aside
              id={drawerId}
              role="dialog"
              aria-modal="true"
              aria-label="Menu principal"
              className="absolute inset-y-0 left-0 flex w-[310px] max-w-[88vw] flex-col bg-forest px-3 pb-[max(20px,env(safe-area-inset-bottom))] pt-[max(20px,env(safe-area-inset-top))] shadow-2xl"
            >
              <div className="flex items-center justify-between px-3">
                <Wordmark size={26} tone="cream-on-forest" />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Fechar menu"
                  className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-xl text-cream/70 hover:bg-white/10 hover:text-white"
                >
                  <X size={21} aria-hidden="true" />
                </button>
              </div>

              <div className="mx-3 mt-6 border-b border-white/10 pb-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-gold">
                  Navegação
                </p>
                <p className="mt-1 text-xs leading-5 text-cream/52">
                  Acesse todas as áreas do seu portal.
                </p>
              </div>

              <nav
                aria-label="Navegação principal"
                className="mt-4 min-h-0 flex-1 overflow-y-auto"
              >
                <NavigationList
                  nav={nav}
                  badges={badges}
                  onNavigate={() => setOpen(false)}
                />
              </nav>

              <form
                action="/logout"
                method="post"
                className="mx-3 mt-5 border-t border-white/10 pt-4"
              >
                <button
                  type="submit"
                  className="focus-ring flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-cream/70 hover:bg-white/10 hover:text-white"
                >
                  <LogOut size={17} aria-hidden="true" />
                  Sair do sistema
                </button>
              </form>
            </aside>
          </div>,
          document.body,
        )}
    </div>
  );
}

export function MobileBottomNavigation({ nav, badges = {} }: SidebarProps) {
  const pathname = usePathname();
  const visibleItems = nav.slice(0, 5);

  return (
    <nav
      aria-label="Navegação rápida"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-forest/10 bg-white/96 px-1.5 pb-[max(8px,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_30px_rgba(23,41,35,0.08)] backdrop-blur md:hidden"
    >
      <ul
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${visibleItems.length}, minmax(0, 1fr))`,
        }}
      >
        {visibleItems.map((item) => {
          const active = isActive(pathname, item);
          const Icon = ICONS[item.icon];
          const count = item.badgeKey ? badges[item.badgeKey] : undefined;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`focus-ring relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-medium transition ${active ? "bg-forest/[0.065] text-forest" : "text-forest/48"}`}
              >
                <Icon
                  size={18}
                  strokeWidth={active ? 2.3 : 1.8}
                  aria-hidden="true"
                />
                <span className="truncate">{item.label}</span>
                {!!count && count > 0 && (
                  <span className="absolute right-[22%] top-0.5 h-2 w-2 rounded-full bg-danger" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
