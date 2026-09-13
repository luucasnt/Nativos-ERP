"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  next: z.string().optional(),
});

export type SignInState = { error: string | null };

export async function signIn(
  _prevState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });

  if (!parsed.success) {
    return { error: "Informe e-mail e senha válidos." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: "E-mail ou senha inválidos." };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (!user || user.status !== "ativo") {
    await supabase.auth.signOut();
    return { error: "Este acesso está inativo. Fale com a Nativos." };
  }

  if (user.must_change_password) {
    redirect("/change-password");
  }

  if (parsed.data.next?.startsWith("/") && !parsed.data.next.startsWith("//")) {
    redirect(parsed.data.next);
  }

  if (user.account_type === "internal") {
    redirect("/admin");
  }

  if (user.linked_driver_id && !user.linked_company_id) {
    redirect("/portal/motorista");
  }

  redirect("/portal/empresa");
}
