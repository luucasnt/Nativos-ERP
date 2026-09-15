import Link from "next/link";
import { SearchX } from "lucide-react";
import { Wordmark } from "@/components/brand/logo";
import { buttonClass } from "@/lib/ui";

export default function NotFound() {
  return <main className="flex min-h-dvh items-center justify-center bg-cream px-4"><section className="surface-elevated w-full max-w-lg px-6 py-12 text-center"><Wordmark size={27} tone="forest-on-cream" priority /><span className="mx-auto mt-8 flex h-12 w-12 items-center justify-center rounded-xl bg-forest/[0.06] text-forest"><SearchX size={23} aria-hidden="true" /></span><p className="eyebrow mt-5">Página não encontrada</p><h1 className="mt-1 text-2xl font-semibold text-forest">Este endereço não está disponível</h1><p className="mt-2 text-sm leading-6 text-forest/65">O link pode ter expirado ou a página foi reorganizada.</p><Link href="/" className={`${buttonClass} mt-6`}>Voltar ao sistema</Link></section></main>;
}
