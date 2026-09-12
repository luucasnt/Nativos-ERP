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

  if (user.account_type === "internal") {
    redirect("/admin");
  }

  if (user.linked_driver_id && !user.linked_company_id) {
    redirect("/portal/motorista");
  }

  redirect("/portal/empresa");
}
