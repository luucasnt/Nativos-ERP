type SkeletonProps = {
  className?: string;
};

// Placeholder de carregamento — usado no lugar de "Loading..." cru ou de
// tela branca piscando enquanto uma página server-rendered busca dado do
// banco. `className` controla forma/tamanho (ex.: "h-4 w-32 rounded-full"
// para uma linha de texto, "h-24 rounded-lg" para um card).
export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-forest/10 ${className}`}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-lg border border-forest/10 bg-white p-5">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-4 h-8 w-20" />
      <Skeleton className="mt-3 h-3 w-32" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 border-b border-forest/5 py-4">
      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="h-6 w-20 rounded-full" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-lg border border-forest/10 bg-white px-5">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}
