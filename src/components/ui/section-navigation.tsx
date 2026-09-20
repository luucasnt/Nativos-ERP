import Link from "next/link";

export type SectionNavigationItem = {
  key: string;
  label: string;
  href: string;
  count?: number;
};

type SectionNavigationProps = {
  activeKey: string;
  ariaLabel: string;
  mobileLabel?: string;
  items: SectionNavigationItem[];
  wrap?: boolean;
};

export function SectionNavigation({
  activeKey,
  ariaLabel,
  mobileLabel = "Navegação da seção",
  items,
  wrap = false,
}: SectionNavigationProps) {
  return (
    <nav aria-label={ariaLabel} className="min-w-0">
      <span className="sr-only">{mobileLabel}</span>
      <div className={`${wrap ? "w-full" : "-mx-3 overflow-x-auto scrollbar-clean px-3 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"} pb-1`}>
        <div className={`${wrap ? "w-full flex-wrap" : "w-max min-w-full"} flex gap-1 border-b border-forest/10`}>
        {items.map((item) => {
          const active = activeKey === item.key;

          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`focus-ring relative flex min-h-11 shrink-0 snap-start items-center gap-2 rounded-t-lg px-3 pb-3 pt-2 text-[13px] font-semibold transition sm:text-sm ${
                active
                  ? "bg-forest/[0.035] text-forest"
                  : "text-forest/60 hover:bg-forest/[0.025] hover:text-forest"
              }`}
            >
              {item.label}
              {typeof item.count === "number" && (
                <span className="rounded-full bg-forest/[0.06] px-2 py-0.5 text-xs">
                  {item.count}
                </span>
              )}
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-gold"
                />
              )}
            </Link>
          );
        })}
        </div>
      </div>
    </nav>
  );
}
