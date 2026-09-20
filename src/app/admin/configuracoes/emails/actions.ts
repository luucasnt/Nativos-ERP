"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInternalUser } from "@/lib/auth/get-current-user";
import { logAudit } from "@/lib/audit";
import { enqueueCommunication, processCommunicationNow } from "@/lib/communication/outbox";
import { assertEmailRecipientAllowed, voucherRecipientForReservation } from "@/lib/communication/email-policy";

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
      auto_send: false,
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
      auto_send: false,
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

function parseManualVariables(raw: string | undefined) {
  const variables: Record<string, string> = {};
  for (const line of (raw ?? "").split("\n")) {
    const separator = line.indexOf("=");
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (key) variables[key] = value;
  }
  return variables;
}

export async function sendEmailManually(
  _prevState: EmailTemplateFormState,
  formData: FormData,
): Promise<EmailTemplateFormState> {
  const user = await requireInternalUser();
  const parsed = z.object({
    templateKey: z.string().min(1),
    recipientEmail: z.string().trim().optional(),
    recipientType: z.enum(["cliente", "parceiro", "fornecedor", "motorista", "interno"]),
    reservationCode: z.string().trim().optional(),
    variables: z.string().optional(),
  }).safeParse({
    templateKey: formData.get("templateKey"),
    recipientEmail: formData.get("recipientEmail"),
    recipientType: formData.get("recipientType"),
    reservationCode: formData.get("reservationCode") || undefined,
    variables: formData.get("variables") || undefined,
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os dados do envio." };

  const variables = parseManualVariables(parsed.data.variables);
  let recipientType = parsed.data.recipientType;
  let recipientEmail = parsed.data.recipientEmail ?? "";
  let reservationId: string | null = null;
  let indicatorPartnerEmails: Array<string | null> = [];

  if (parsed.data.templateKey !== "acesso_portal") {
    if (!parsed.data.reservationCode) return { error: "Informe a reserva para manter o envio rastreável." };
    const reservation = await prisma.reservation.findUnique({
      where: { code: parsed.data.reservationCode.toUpperCase() },
      include: {
        client: { select: { name: true, email: true } },
        origin_partner: { select: { name: true, contact_email: true, portal_email: true } },
        services: {
          select: {
            supplier: { select: { contact_email: true, portal_email: true } },
            driver: { select: { email: true, portal_email: true } },
          },
        },
      },
    });
    if (!reservation) return { error: "Reserva não encontrada." };
    reservationId = reservation.id;
    variables.codigo_reserva = reservation.code;
    variables.reservation_id = reservation.id;

    if (parsed.data.templateKey === "voucher_cliente") {
      const recipient = voucherRecipientForReservation({
        client: reservation.client,
        originPartner: reservation.origin_partner,
      });
      if (!recipient.email) return { error: `O destinatário responsável não possui e-mail cadastrado. ${recipient.reason}` };
      recipientType = recipient.type;
      recipientEmail = recipient.email;
      variables.nome = recipient.name;
    } else {
      if (reservation.referrer_type === "company" && reservation.referrer_id) {
        const indicator = await prisma.company.findUnique({
          where: { id: reservation.referrer_id },
          select: { contact_email: true, portal_email: true },
        });
        indicatorPartnerEmails = [indicator?.contact_email ?? null, indicator?.portal_email ?? null];
      }
      const normalized = recipientEmail.trim().toLowerCase();
      const linkedEmails = recipientType === "parceiro"
        ? [reservation.origin_partner?.contact_email, reservation.origin_partner?.portal_email, ...indicatorPartnerEmails]
        : recipientType === "fornecedor"
          ? reservation.services.flatMap((service) => [service.supplier?.contact_email, service.supplier?.portal_email])
          : recipientType === "motorista"
            ? reservation.services.flatMap((service) => [service.driver?.email, service.driver?.portal_email])
            : [];
      if (!linkedEmails.some((email) => email?.trim().toLowerCase() === normalized)) {
        return { error: "O e-mail informado não pertence a um parceiro, fornecedor ou motorista vinculado a esta reserva." };
      }
    }
  }

  if (!recipientEmail || !z.string().email().safeParse(recipientEmail).success) {
    return { error: "Informe um e-mail válido." };
  }
  try {
    assertEmailRecipientAllowed(parsed.data.templateKey, recipientType);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Destinatário não permitido para este modelo." };
  }

  const communication = await enqueueCommunication({
    templateKey: parsed.data.templateKey,
    recipientType,
    recipientEmail,
    variables,
    idempotencyKey: `manual:${crypto.randomUUID()}`,
  });

  // O clique do administrador é a autorização explícita para processar um
  // único envio. Em caso de erro, o registro fica no outbox para análise e
  // reprocessamento, nunca é perdido silenciosamente.
  await processCommunicationNow(communication.id);
  await logAudit({
    actorId: user.id,
    action: "email_manual_disparado",
    entityType: reservationId ? "reservation" : "other",
    entityId: reservationId ?? communication.id,
    metadata: { communicationId: communication.id, templateKey: parsed.data.templateKey, recipientEmail, recipientType },
  });

  redirect("/admin/configuracoes/outbox");
}

export async function sendEmailManuallyAction(formData: FormData): Promise<void> {
  const result = await sendEmailManually({ error: null }, formData);
  if (result.error) throw new Error(result.error);
}
