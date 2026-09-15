"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const STACK_LIMIT = 30;

function readStack(storageKey: string) {
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey) ?? "[]");
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function writeStack(storageKey: string, stack: string[]) {
  try {
    sessionStorage.setItem(
      storageKey,
      JSON.stringify(stack.slice(-STACK_LIMIT)),
    );
  } catch {
    // A navegação continua funcionando pelo fallback mesmo sem armazenamento.
  }
}

type NavigationBackButtonProps = {
  homeHref: string;
  sectionHrefs: string[];
};

export function NavigationBackButton({
  homeHref,
  sectionHrefs,
}: NavigationBackButtonProps) {
  const pathname = usePathname();
  const router = useRouter();
  const storageKey = `nativos:navigation:${homeHref}`;
  const activeSection = sectionHrefs
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((left, right) => right.length - left.length)[0];
  const contextualFallback =
    activeSection && activeSection !== pathname ? activeSection : homeHref;

  useEffect(() => {
    const stack = readStack(storageKey);

    if (stack.at(-1) === pathname) return;

    if (stack.at(-2) === pathname) {
      stack.pop();
    } else {
      stack.push(pathname);
    }

    writeStack(storageKey, stack);
  }, [pathname, storageKey]);

  if (pathname === homeHref) return null;

  function goBack() {
    const stack = readStack(storageKey);

    if (stack.at(-1) !== pathname) stack.push(pathname);
    stack.pop();

    const previousPath = stack.at(-1);
    const target =
      previousPath && previousPath !== pathname
        ? previousPath
        : contextualFallback;

    if (previousPath) writeStack(storageKey, stack);
    router.push(target);
  }

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label="Voltar para a página anterior"
      title="Voltar"
      className="focus-ring inline-flex h-11 w-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-forest/12 bg-white text-sm font-medium text-forest/65 shadow-[0_1px_2px_rgba(23,41,35,0.04)] transition hover:border-forest/25 hover:bg-forest/[0.025] hover:text-forest xl:h-9 xl:w-auto xl:rounded-lg xl:px-3"
    >
      <ArrowLeft size={17} aria-hidden="true" />
      <span className="hidden xl:inline">Voltar</span>
    </button>
  );
}
