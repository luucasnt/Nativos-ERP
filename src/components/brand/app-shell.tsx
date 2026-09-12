import { Logo } from "@/components/brand/logo";

type AppShellProps = {
  title: string;
  userName: string;
  children: React.ReactNode;
};

export function AppShell({ title, userName, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-forest/10 bg-forest px-6 py-4 text-cream">
        <div className="flex items-center gap-3">
          <Logo size={32} tone="gold-on-forest" />
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
      <main className="flex-1 bg-cream px-6 py-10">{children}</main>
    </div>
  );
}
