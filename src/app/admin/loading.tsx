import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return <div className="mx-auto max-w-[1480px] space-y-5" aria-label="Carregando conteúdo">
    <div className="space-y-2"><Skeleton className="h-3 w-32" /><Skeleton className="h-10 w-64" /><Skeleton className="h-4 w-full max-w-xl" /></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-xl" />)}</div>
    <Skeleton className="h-16 rounded-xl" /><Skeleton className="h-72 rounded-xl" />
  </div>;
}
