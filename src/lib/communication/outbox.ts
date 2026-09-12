// Outbox real de e-mail (spec seção 8 — Communication): nunca
// fire-and-forget. `enqueueCommunication` só grava a fila (idempotente por
// idempotency_key); `processOutboxOnce` é quem de fato manda pelo Resend,
// com retry controlado por `attempts` — chamado por um cron (ver
// vercel.json + src/app/api/outbox/process/route.ts), nunca disparado
// inline na mesma requisição que enfileira.
import { Resend } from "resend";
import type { RecipientType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { renderTemplate } from "@/lib/communication/render-template";

const MAX_ATTEMPTS = 5;

export async function enqueueCommunication(params: {
  templateKey: string;
  recipientType: RecipientType;
  recipientEmail: string;
  variables?: Record<string, string>;
  idempotencyKey: string;
}) {
  const existing = await prisma.communication.findUnique({ where: { idempotency_key: params.idempotencyKey } });
  if (existing) {
    return existing;
  }

  const template = await prisma.emailTemplate.findUnique({ where: { key: params.templateKey } });
  if (!template || !template.active) {
    throw new Error(`Template de e-mail "${params.templateKey}" não existe ou está inativo.`);
  }

  return prisma.communication.create({
    data: {
      template_key: params.templateKey,
      category: template.category,
      recipient_type: params.recipientType,
      recipient_email: params.recipientEmail,
      variables: params.variables ?? {},
      idempotency_key: params.idempotencyKey,
    },
  });
}

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new Resend(apiKey);
}

async function sendOne(communicationId: string) {
  const communication = await prisma.communication.findUniqueOrThrow({
    where: { id: communicationId },
    include: { template: true },
  });

  if (!communication.template) {
    await prisma.communication.update({
      where: { id: communicationId },
      data: { status: "cancelado", last_error: "Template de e-mail não encontrado (removido depois de enfileirado)." },
    });
    return;
  }

  await prisma.communication.update({ where: { id: communicationId }, data: { status: "enviando" } });

  const variables = (communication.variables as Record<string, string> | null) ?? {};
  const subject = renderTemplate(communication.template.subject, variables);
  const body = renderTemplate(communication.template.body, variables);

  const resend = getResendClient();
  if (!resend) {
    await prisma.communication.update({
      where: { id: communicationId },
      data: {
        status: "falhou",
        attempts: { increment: 1 },
        last_error: "RESEND_API_KEY não configurada — configure um projeto Resend real para enviar e-mails.",
      },
    });
    return;
  }

  try {
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Nativos Experiences <no-reply@nativosexperiences.test>",
      to: communication.recipient_email,
      subject,
      html: body,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    await prisma.communication.update({
      where: { id: communicationId },
      data: { status: "enviado", sent_at: new Date(), last_error: null },
    });
  } catch (error) {
    await prisma.communication.update({
      where: { id: communicationId },
      data: {
        status: "falhou",
        attempts: { increment: 1 },
        last_error: error instanceof Error ? error.message : "Falha desconhecida ao enviar.",
      },
    });
  }
}

// Idempotente/seguro de chamar repetidamente: processa um lote de
// pendentes + falhas que ainda não esgotaram as tentativas. Quem dispara
// isso em intervalos (cron) decide o espaçamento do retry — esta função
// não dorme nem agenda sozinha.
export async function processOutboxOnce(batchSize = 20) {
  const pending = await prisma.communication.findMany({
    where: {
      OR: [{ status: "pendente" }, { status: "falhou", attempts: { lt: MAX_ATTEMPTS } }],
    },
    orderBy: { created_at: "asc" },
    take: batchSize,
  });

  for (const communication of pending) {
    await sendOne(communication.id);
  }

  return { processed: pending.length };
}
