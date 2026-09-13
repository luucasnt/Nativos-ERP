import Link from "next/link";

// Placeholder — o design de referência da Fase 8 inclui o link "Recuperar
// acesso" no login, mas nenhuma fase construiu um fluxo de recuperação de
// senha por e-mail ainda (é uma decisão de produto própria: outbox de
// e-mail de reset, expiração de token etc.). Fica registrado aqui em vez
// de um link quebrado ou puramente decorativo, até virar um requisito
// explícito.
export default function RecuperarAcessoPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-gray-50 px-6 py-16">
      <div className="w-full max-w-sm rounded-[6px] border border-border bg-white p-9 text-center">
        <h1 className="mb-2 text-xl font-bold text-ink-900">Recuperação de acesso</h1>
        <p className="mb-6 text-[13.5px] leading-relaxed text-ink-500">
          Esse fluxo ainda não foi implementado. Fale com a equipe Nativos
          Experiences para redefinir sua senha.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-[5px] bg-forest-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-forest-600"
        >
          Voltar para o login
        </Link>
      </div>
    </main>
  );
}
