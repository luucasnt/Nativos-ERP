"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInternalUser } from "@/lib/auth/get-current-user";
import { logAudit } from "@/lib/audit";

const PATH = "/admin/configuracoes/emails";

const templateSchema = z.object({
  key: z
    .string()
    .min(1, "Informe a chave.")
    .regex(/^[a-z0-9_]+$/, "Use apenas letras minúsculas, números e underscore."),
  name: z.string().min(1, "Informe o nome."),
  subject: z.string().min(1, "Informe o assunto."),
  body: z.string().min(1, "Informe o corpo do e-mail."),
  category: z.string().min(1, "Informe a categoria."),
  auto_send: z.enum(["on"]).optional(),
  allowed_variables: z.string().optional(),
});

export type EmailTemplateFormState = { error: string | null };

function parseVariables(raw: string | undefined) {
  if (!raw) return [];
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export async function createEmailTemplate(
  _prevState: EmailTemplateFormState,
  formData: FormData,
): Promise<EmailTemplateFormState> {
  const user = await requireInternalUser();

  const parsed = templateSchema.safeParse({
    key: formData.get("key"),
    name: formData.get("name"),
    subject: formData.get("subject"),
    body: formData.get("body"),
    category: formData.get("category"),
    auto_send: formData.get("auto_send") || undefined,
    allowed_variables: formData.get("allowed_variables") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const existing = await prisma.emailTemplate.findUnique({ where: { key: parsed.data.key } });
  if (existing) {
    return { error: "Já existe um template com essa chave." };
  }

  await prisma.emailTemplate.create({
    data: {
      key: parsed.data.key,
      name: parsed.data.name,
      subject: parsed.data.subject,
      body: parsed.data.body,
      category: parsed.data.category,
      auto_send: parsed.data.auto_send === "on",
      allowed_variables: parseVariables(parsed.data.allowed_variables),
    },
  });

  await logAudit({
    actorId: user.id,
    action: "template_email_criado",
    entityType: "other",
    entityId: parsed.data.key,
  });

  revalidatePath(PATH);
  redirect(PATH);
}

export async function updateEmailTemplate(
  key: string,
  _prevState: EmailTemplateFormState,
  formData: FormData,
): Promise<EmailTemplateFormState> {
  const user = await requireInternalUser();

  const parsed = templateSchema.safeParse({
    key,
    name: formData.get("name"),
    subject: formData.get("subject"),
    body: formData.get("body"),
    category: formData.get("category"),
    auto_send: formData.get("auto_send") || undefined,
    allowed_variables: formData.get("allowed_variables") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  await prisma.emailTemplate.update({
    where: { key },
    data: {
      name: parsed.data.name,
      subject: parsed.data.subject,
      body: parsed.data.body,
      category: parsed.data.category,
      auto_send: parsed.data.auto_send === "on",
      allowed_variables: parseVariables(parsed.data.allowed_variables),
    },
  });

  await logAudit({
    actorId: user.id,
    action: "template_email_atualizado",
    entityType: "other",
    entityId: key,
  });

  revalidatePath(PATH);
  redirect(PATH);
}

export async function deleteEmailTemplate(key: string) {
  const user = await requireInternalUser();

  await prisma.emailTemplate.delete({ where: { key } });

  await logAudit({
    actorId: user.id,
    action: "template_email_excluido",
    entityType: "other",
    entityId: key,
  });

  revalidatePath(PATH);
}
