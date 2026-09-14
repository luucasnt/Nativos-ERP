"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  identifier: z.string().min(3).max(254),
  password: z.string().min(1).max(128),
  next: z.string().max(512).optional(),
});

export type SignInState = { error: string | null };

export async function signIn(
  _prevState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const parsed = schema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });

  if (!parsed.success) {
    return { error: "Informe e-mail e senha válidos." };
  }

  const identifier = parsed.data.identifier.trim();
  const normalizedPhone = identifier.replace(/\D/g, "");
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: identifier.toLowerCase() },
        ...(normalizedPhone.length >= 8 ? [{ linked_driver: { phone: { contains: normalizedPhone.slice(-8) } } }, { linked_company: { contact_phone: { contains: normalizedPhone.slice(-8) } } }] : []),
      ],
    },
  });
  if (!user?.email) return { error: "E-mail, telefone ou senha inválidos." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: "E-mail ou senha inválidos." };
  }

  if (user.status !== "ativo") {
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
