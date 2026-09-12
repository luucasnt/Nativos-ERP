import { getCurrentUser } from "@/lib/auth/get-current-user";

export default async function AdminHomePage() {
  const user = await getCurrentUser();

  return (
    <div>
      <h1 className="font-serif text-3xl text-forest">
        Bem-vindo(a), {user?.display_name ?? user?.native_name ?? user?.email}
      </h1>
      <p className="mt-2 text-forest/70">
        Perfil interno:{" "}
        {user?.is_owner
          ? "proprietário(a) do sistema"
          : (user?.internal_role ?? "—")}
      </p>
      <p className="mt-8 max-w-2xl text-sm text-forest/60">
        Use o menu à esquerda para gerenciar cadastros, aprovações e as
        configurações gerais do sistema.
      </p>
    </div>
  );
}
