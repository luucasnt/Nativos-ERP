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
