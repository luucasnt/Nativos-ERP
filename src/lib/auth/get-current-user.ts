import "server-only";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Fonte da verdade para autorização fina: usada em Server Components e
// Server Actions (nunca em middleware/Edge, onde o Prisma não roda).
export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { auth_user_id: authUser.id },
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
