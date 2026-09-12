import Link from "next/link";
import { Wordmark } from "@/components/brand/logo";

type NavItem = {
  href: string;
  label: string;
};

type AppShellProps = {
  title: string;
  userName: string;
  nav?: NavItem[];
  children: React.ReactNode;
};

export function AppShell({ title, userName, nav, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-forest/10 bg-forest px-6 py-4 text-cream">
        <div className="flex items-center gap-4">
          <Wordmark size={22} tone="cream-on-forest" />
          <span className="h-5 w-px bg-cream/30" aria-hidden="true" />
          <span className="font-serif text-lg tracking-wide">{title}</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
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
        {nav && nav.length > 0 && (
          <nav className="w-56 shrink-0 border-r border-forest/10 bg-white/60 px-3 py-6">
            <ul className="flex flex-col gap-1">
              {nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block rounded-sm px-3 py-2 text-sm text-forest/80 transition hover:bg-forest/5 hover:text-forest"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <main className="flex-1 bg-cream px-6 py-10">{children}</main>
      </div>
    </div>
  );
}
