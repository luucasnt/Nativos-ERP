import { randomBytes } from "node:crypto";
import type { AccountType, InternalRole, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AppMetadata } from "@/lib/auth/types";
// `import type` é apagado na compilação — não executa o `import "server-only"`
// de admin.ts em runtime, só reaproveita o tipo de retorno exato do client.
import type { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Implementação de fato do provisionamento de login (Supabase Auth + User),
// sem a marca `server-only` — propositalmente, para poder ser chamada tanto
// pelo app Next.js (via provision-user.ts, que injeta o client guardado por
// `server-only`) quanto por scripts fora do runtime do Next (prisma/seed.ts,
// rodado via `tsx`), que não têm a condição de bundler "react-server" que
// faz o pacote `server-only` funcionar sem lançar erro.
type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

export function generateTemporaryPassword() {
  return randomBytes(9).toString("base64url");
}

function toAppMetadata(user: {
  id: string;
  role: AppMetadata["role"];
  account_type: AccountType;
  internal_role: InternalRole | null;
  is_owner: boolean;
  linked_company_id: string | null;
  linked_driver_id: string | null;
  must_change_password: boolean;
  status: UserStatus;
}): AppMetadata {
  return {
    user_id: user.id,
    role: user.role,
    account_type: user.account_type,
    internal_role: user.internal_role,
    is_owner: user.is_owner,
    linked_company_id: user.linked_company_id,
    linked_driver_id: user.linked_driver_id,
    must_change_password: user.must_change_password,
    status: user.status,
  };
}

export async function syncAppMetadataWithClient(admin: SupabaseAdminClient, userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  await admin.auth.admin.updateUserById(user.auth_user_id, {
    app_metadata: toAppMetadata(user),
  });
}

type CreateInternalUserInput = {
  email: string;
  nativeName?: string;
  internalRole: InternalRole;
  isOwner?: boolean;
};

export async function createInternalUserWithClient(
  admin: SupabaseAdminClient,
  input: CreateInternalUserInput,
) {
  const temporaryPassword = generateTemporaryPassword();

  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: temporaryPassword,
    email_confirm: true,
  });

  if (error || !data.user) {
    throw error ?? new Error("Falha ao criar usuário no Supabase Auth");
  }

  const user = await prisma.user.create({
    data: {
      auth_user_id: data.user.id,
      email: input.email,
      native_name: input.nativeName,
      role: input.isOwner ? "admin" : "user",
      account_type: "internal",
      internal_role: input.internalRole,
      is_owner: input.isOwner ?? false,
      must_change_password: true,
    },
  });

  await syncAppMetadataWithClient(admin, user.id);

  return { user, temporaryPassword };
}

type CreatePortalUserInput = {
  email: string;
  nativeName?: string;
  linkedCompanyId?: string;
  linkedDriverId?: string;
};

export async function createPortalUserWithClient(
  admin: SupabaseAdminClient,
  input: CreatePortalUserInput,
) {
  if (!input.linkedCompanyId && !input.linkedDriverId) {
    throw new Error(
      "Um usuário de portal precisa estar vinculado a uma Company e/ou a um Driver.",
    );
  }

  const temporaryPassword = generateTemporaryPassword();

  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: temporaryPassword,
    email_confirm: true,
  });

  if (error || !data.user) {
    throw error ?? new Error("Falha ao criar usuário no Supabase Auth");
  }

  const user = await prisma.user.create({
    data: {
      auth_user_id: data.user.id,
      email: input.email,
      native_name: input.nativeName,
      role: "user",
      account_type: "portal",
      linked_company_id: input.linkedCompanyId,
      linked_driver_id: input.linkedDriverId,
      must_change_password: true,
    },
  });

  await syncAppMetadataWithClient(admin, user.id);

  return { user, temporaryPassword };
}

export async function resetTemporaryPasswordWithClient(admin: SupabaseAdminClient, userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const temporaryPassword = generateTemporaryPassword();

  const { error } = await admin.auth.admin.updateUserById(user.auth_user_id, {
    password: temporaryPassword,
  });

  if (error) {
    throw error;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { must_change_password: true },
  });
  await syncAppMetadataWithClient(admin, userId);

  return { temporaryPassword };
}
