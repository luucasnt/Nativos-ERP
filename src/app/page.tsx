import Link from "next/link";
import { LogoTile } from "@/components/brand/logo";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <LogoTile size={72} />
      <p className="max-w-md text-forest/70">
        Sistema de gestão da Nativos Experiences.
      </p>
      <Link
        href="/login"
        className="rounded-sm bg-forest px-6 py-2 text-cream transition hover:bg-forest-light"
      >
        Entrar
      </Link>
    </main>
  );
}
