// Outbox real de e-mail (spec seção 8 — Communication): nunca
// fire-and-forget. `enqueueCommunication` só grava a fila (idempotente por
// idempotency_key); `processOutboxOnce` é quem de fato manda pelo Resend,
// com retry controlado por `attempts` — chamado por um cron (ver
// vercel.json + src/app/api/outbox/process/route.ts), nunca disparado
// inline na mesma requisição que enfileira.
import { Resend } from "resend";
import { type RecipientType } from "@prisma/client";
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

  return prisma.communication.upsert({
    where: { idempotency_key: params.idempotencyKey }, update: {},
    create: {
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
  const communication = await prisma.communication.findUniqueOrThrow({ where: { id: communicationId }, include: { template: true } });
  const staleBefore = new Date(Date.now() - 15 * 60 * 1000);
  const idempotencyExpired = communication.updated_at.getTime() < Date.now() - 23 * 60 * 60 * 1000;
  if (idempotencyExpired && (communication.status === "enviando" || communication.last_error?.startsWith("[envio_incerto]"))) {
    // Resend keeps dedupe keys for 24 hours. An uncertain old send must be
    // reviewed, rather than risk sending it again after that window.
    await prisma.communication.updateMany({ where: { id: communicationId, updated_at: communication.updated_at, status: communication.status }, data: { status: "falhou", attempts: MAX_ATTEMPTS, last_error: "Envio anterior sem confirmação. Verifique no provedor antes de reenviar." } });
    return false;
  }
  const leaseTime = new Date();
  const claimed = await prisma.communication.updateMany({ where: {
    id: communicationId, updated_at: communication.updated_at, attempts: { lt: MAX_ATTEMPTS },
    OR: [{ status: "pendente" }, { status: "falhou" }, { status: "enviando", updated_at: { lt: staleBefore } }],
  }, data: { status: "enviando", attempts: { increment: 1 }, updated_at: leaseTime } });
  if (!claimed.count) return false;
  const lease = { id: communicationId, status: "enviando" as const, updated_at: leaseTime };
  if (!communication.template || !communication.template.active) {
    await prisma.communication.updateMany({
      where: lease,
      data: { status: "cancelado", last_error: "Template de e-mail não encontrado ou inativo." },
    });
    return true;
  }

  const variables = (communication.variables as Record<string, string> | null) ?? {};
  const subject = renderTemplate(communication.template.subject, variables);
  const body = renderTemplate(communication.template.body, variables);

  const resend = getResendClient();
  if (!resend) {
    await prisma.communication.updateMany({
      where: lease,
      data: {
        status: "falhou",
        last_error: "RESEND_API_KEY não configurada — configure um projeto Resend real para enviar e-mails.",
      },
    });
    return true;
  }

  let rejectedByProvider = false;
  try {
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Nativos Experiences <no-reply@nativosexperiences.test>",
      to: communication.recipient_email,
      subject,
      html: body,
    }, { idempotencyKey: `nativos-communication:${communication.id}` });

    if (result.error) {
      rejectedByProvider = true;
      throw new Error(result.error.message);
    }

    await prisma.communication.updateMany({
      where: lease,
      data: { status: "enviado", sent_at: new Date(), last_error: null },
    });
  } catch (error) {
    await prisma.communication.updateMany({
      where: lease,
      data: {
        status: "falhou",
        last_error: `${rejectedByProvider ? "" : "[envio_incerto] "}${error instanceof Error ? error.message : "Falha desconhecida ao enviar."}`,
      },
    });
  }
  return true;
}

export async function processCommunicationNow(communicationId: string) {
  await sendOne(communicationId);
  return prisma.communication.findUnique({ where: { id: communicationId } });
}

// Idempotente/seguro de chamar repetidamente: processa um lote de
// pendentes + falhas que ainda não esgotaram as tentativas. Quem dispara
// isso em intervalos (cron) decide o espaçamento do retry — esta função
// não dorme nem agenda sozinha.
export async function processOutboxOnce(batchSize = 20) {
  await prisma.communication.updateMany({ where: { status: "enviando", attempts: { gte: MAX_ATTEMPTS }, updated_at: { lt: new Date(Date.now() - 15 * 60 * 1000) } }, data: { status: "falhou", last_error: "Envio interrompido no limite de tentativas. Verifique no provedor antes de reenviar." } });
  const pending = await prisma.communication.findMany({
    where: {
      attempts: { lt: MAX_ATTEMPTS },
      OR: [{ status: "pendente" }, { status: "falhou" }, { status: "enviando", updated_at: { lt: new Date(Date.now() - 15 * 60 * 1000) } }],
    },
    orderBy: { created_at: "asc" },
    take: batchSize,
  });

  let processed = 0;
  for (const communication of pending) {
    if (await sendOne(communication.id)) processed++;
  }

  return { processed };
}
