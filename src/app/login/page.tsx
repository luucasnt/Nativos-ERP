import { Logo } from "@/components/brand/logo";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center gap-3">
          <Logo size={56} tone="gold-on-forest" />
          <h1 className="font-serif text-2xl text-forest">Nativos ERP</h1>
          <p className="text-sm text-forest/70">
            Acesse com o e-mail cadastrado pela Nativos Experiences.
          </p>
        </div>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
