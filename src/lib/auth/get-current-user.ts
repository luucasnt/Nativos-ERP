import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_USER_ID_HEADER } from "@/lib/supabase/middleware";

// Fonte da verdade para autorização fina: usada em Server Components e
// Server Actions (nunca em middleware/Edge, onde o Prisma não roda).
//
// Lê o id do usuário do header que o middleware já propagou (ver
// AUTH_USER_ID_HEADER em src/lib/supabase/middleware.ts) em vez de chamar
// `supabase.auth.getUser()` de novo aqui — o middleware já faz essa
// validação de rede contra o Supabase Auth uma vez por requisição pra
// qualquer rota que chega até uma página/Server Action; repetir a mesma
// chamada aqui só duplicava a latência de rede sem validar nada que já
// não tivesse sido validado. O header só pode ter sido setado pelo
// próprio middleware (qualquer valor vindo do cliente é descartado lá
// antes), então confiar nele aqui não abre uma via de bypass nova.
export async function getCurrentUser() {
  const headerList = await headers();
  const authUserId = headerList.get(AUTH_USER_ID_HEADER);

  if (!authUserId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { auth_user_id: authUserId },
    include: {
      linked_company: true,
      linked_driver: true,
    },
  });

  return user;
}

// Segunda checagem de autorização dentro da própria Server Action —
// defesa em profundidade além do gate que já existe no layout/página, já
// que uma Server Action pode em tese ser invocada diretamente.
export async function requireInternalUser() {
  const user = await getCurrentUser();

  if (!user || user.account_type !== "internal" || user.status !== "ativo") {
    throw new Error("Acesso restrito à equipe interna da Nativos.");
  }

  return user;
}
