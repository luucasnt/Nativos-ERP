import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AUTH_USER_ID_HEADER } from "@/lib/supabase/middleware";

// Fonte da verdade para autorização fina: usada em Server Components e
// Server Actions (nunca em middleware/Edge, onde o Prisma não roda).
//
// Lê o id do usuário do header que o middleware já propagou após validar
// criptograficamente os claims da sessão (ver
// AUTH_USER_ID_HEADER em src/lib/supabase/middleware.ts) em vez de chamar
// `supabase.auth.getUser()` aqui. O header só pode ter sido setado pelo
// próprio middleware (qualquer valor vindo do cliente é descartado lá
// antes), então confiar nele aqui não abre uma via de bypass nova.
export const getCurrentUser = cache(async function getCurrentUser() {
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
});

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

export async function assertActiveUser() {
  const user = await getCurrentUser();
  if (!user || user.status !== "ativo") {
    throw new Error("Sessão expirada ou acesso desativado. Faça login novamente.");
  }
  return user;
}

export async function assertActiveCompanyPortalUser() {
  const user = await assertActiveUser();
  if (user.account_type !== "portal" || !user.linked_company) {
    throw new Error("Acesso restrito ao portal da empresa.");
  }
  return {
    ...user,
    linked_company_id: user.linked_company_id!,
    linked_company: user.linked_company,
  };
}

export async function assertActiveDriverPortalUser() {
  const user = await assertActiveUser();
  if (user.account_type !== "portal" || !user.linked_driver) {
    throw new Error("Acesso restrito ao portal do motorista.");
  }
  return {
    ...user,
    linked_driver_id: user.linked_driver_id!,
    linked_driver: user.linked_driver,
  };
}

export async function requireOwnerUser() {
  const user = await requireInternalUser();
  if (!user.is_owner || user.role !== "admin") {
    throw new Error("Acesso restrito ao proprietário da conta.");
  }
  return user;
}

export function canAccessFinance(user: {
  role: "admin" | "user";
  internal_role: "financeiro" | "operacional" | null;
  is_owner: boolean;
}) {
  return user.role === "admin" || user.is_owner || user.internal_role === "financeiro";
}

export async function requireFinancialUser() {
  const user = await requireInternalUser();
  if (!canAccessFinance(user)) {
    throw new Error("Acesso restrito à administração e à equipe financeira da Nativos.");
  }
  return user;
}

export async function requireCompanyPortalUser() {
  const user = await getCurrentUser();

  if (!user || user.account_type !== "portal" || user.status !== "ativo" || !user.linked_company) {
    redirect("/login/parceiro");
  }

  return { ...user, linked_company: user.linked_company };
}

export async function requireDriverPortalUser() {
  const user = await getCurrentUser();

  if (!user || user.account_type !== "portal" || user.status !== "ativo" || !user.linked_driver) {
    redirect("/login/motorista");
  }

  return { ...user, linked_driver: user.linked_driver };
}
