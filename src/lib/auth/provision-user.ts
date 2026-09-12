import "server-only";
import { randomBytes } from "node:crypto";
import type { AccountType, InternalRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AppMetadata } from "@/lib/auth/types";

// Gera uma senha temporária legível (sem depender de e-mail/OTP), conforme
// o fluxo de primeiro acesso descrito na especificação: "senha temporária
// gerada internamente, sem OTP/verificação por e-mail visível". A senha em
// si nunca é persistida em texto plano — só entregue uma vez, no retorno
// desta função, para quem criou o cadastro comunicar ao usuário.
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
  };
}

// Mantém app_metadata (usado pelo middleware, na borda) em sincronia com o
// registro Prisma `User` (fonte da verdade). Deve ser chamado sempre que um
// User for criado ou tiver um dos campos de autorização alterado.
export async function syncAppMetadata(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const admin = createSupabaseAdminClient();

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

// Cria um login interno (admin/financeiro/operacional): usuário no Supabase
// Auth com senha temporária + registro correspondente em `users`.
export async function createInternalUser(input: CreateInternalUserInput) {
  const admin = createSupabaseAdminClient();
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

  await syncAppMetadata(user.id);

  return { user, temporaryPassword };
}

type CreatePortalUserInput = {
  email: string;
  nativeName?: string;
  linkedCompanyId?: string;
  linkedDriverId?: string;
};

// Cria um login de portal (parceiro/fornecedor por e-mail da Company, ou
// motorista por e-mail do Driver). Suporta o caso de dono-fornecedor que
// também dirige: um único User com linked_company_id e linked_driver_id
// preenchidos simultaneamente.
export async function createPortalUser(input: CreatePortalUserInput) {
  if (!input.linkedCompanyId && !input.linkedDriverId) {
    throw new Error(
      "Um usuário de portal precisa estar vinculado a uma Company e/ou a um Driver.",
    );
  }

  const admin = createSupabaseAdminClient();
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

  await syncAppMetadata(user.id);

  return { user, temporaryPassword };
}
