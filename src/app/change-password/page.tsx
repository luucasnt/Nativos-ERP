import { Logo } from "@/components/brand/logo";
import { ChangePasswordForm } from "./change-password-form";

export default function ChangePasswordPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center gap-3">
          <Logo size={56} tone="gold-on-forest" />
          <h1 className="font-serif text-2xl text-forest">
            Defina sua senha
          </h1>
          <p className="text-center text-sm text-forest/70">
            Este é seu primeiro acesso. Escolha uma senha definitiva para
            continuar.
          </p>
        </div>
        <ChangePasswordForm />
      </div>
    </main>
  );
}
