"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { syncAppMetadata } from "@/lib/auth/provision-user";

const schema = z
  .object({
    password: z.string().min(8, "Use pelo menos 8 caracteres."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

export type ChangePasswordState = { error: string | null };

export async function changePassword(
  _prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const parsed = schema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: "Não foi possível atualizar a senha." };
  }

  const user = await prisma.user.update({
    where: { auth_user_id: authUser.id },
    data: { must_change_password: false },
  });

  await syncAppMetadata(user.id);

  // A senha temporária deixa de ser válida para o fluxo atual. Encerrar a
  // sessão garante que o JWT antigo (com must_change_password=true) não faça
  // o middleware devolver o usuário para esta mesma tela.
  const linkedCompany = user.linked_company_id
    ? await prisma.company.findUnique({ where: { id: user.linked_company_id }, select: { roles: true } })
    : null;
  const loginPath = user.account_type === "internal"
    ? "/login/admin"
    : user.linked_driver_id && !user.linked_company_id
      ? "/login/motorista"
      : linkedCompany?.roles.includes("fornecedor")
        ? "/login/fornecedor"
        : "/login/parceiro";
  await supabase.auth.signOut();
  redirect(loginPath);
}
