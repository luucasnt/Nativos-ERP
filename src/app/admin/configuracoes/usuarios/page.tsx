import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { tableClass, thClass } from "@/lib/ui";
import { NewInternalUserForm } from "./new-user-form";
import { UserRow } from "./user-row";

export default async function UsuariosInternosPage() {
  const [actor, users] = await Promise.all([
    getCurrentUser(),
    prisma.user.findMany({
      where: { account_type: "internal" },
      orderBy: { created_at: "asc" },
    }),
  ]);

  return (
    <div>
      <h1 className="mb-6 font-serif text-3xl text-forest">Usuários internos</h1>

      <NewInternalUserForm actorIsOwner={actor?.is_owner ?? false} />

      <table className={tableClass}>
        <thead>
          <tr>
            <th className={thClass}>Nome</th>
            <th className={thClass}>E-mail</th>
            <th className={thClass}>Perfil</th>
            <th className={thClass}>Status</th>
            <th className={thClass}></th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <UserRow
              key={u.id}
              id={u.id}
              email={u.email}
              nativeName={u.native_name}
              displayName={u.display_name}
              internalRole={u.internal_role}
              isOwner={u.is_owner}
              status={u.status}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
