// Integração real (Postgres): outbox de Communication (spec seção 8).
// RESEND_API_KEY não está configurada neste ambiente de desenvolvimento
// (mesma situação do Supabase em outras fases) — processOutboxOnce cai no
// caminho "falha com erro claro", que é exatamente o comportamento que
// este teste verifica (nunca lança exceção, nunca finge sucesso).
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { enqueueCommunication, processOutboxOnce } from "@/lib/communication/outbox";

const prisma = new PrismaClient();

afterAll(async () => {
  await prisma.$disconnect();
});

async function ensureTemplate(key: string) {
  return prisma.emailTemplate.upsert({
    where: { key },
    update: { active: true },
    create: {
      key,
      name: key,
      subject: "Assunto {{nome}}",
      body: "<p>Corpo {{nome}}</p>",
      category: "teste",
      active: true,
    },
  });
}

describe("enqueueCommunication", () => {
  it("exige um template existente e ativo", async () => {
    await expect(
      enqueueCommunication({
        templateKey: `template-inexistente-${Date.now()}`,
        recipientType: "cliente",
        recipientEmail: "teste@example.test",
        idempotencyKey: `test-outbox-${Date.now()}`,
      }),
    ).rejects.toThrow();
  });

  it("é idempotente por idempotency_key", async () => {
    const key = `test-template-${Date.now()}`;
    await ensureTemplate(key);
    const idempotencyKey = `test-outbox-idem-${Date.now()}`;

    try {
      const first = await enqueueCommunication({
        templateKey: key,
        recipientType: "cliente",
        recipientEmail: "teste@example.test",
        variables: { nome: "Ana" },
        idempotencyKey,
      });
      const second = await enqueueCommunication({
        templateKey: key,
        recipientType: "cliente",
        recipientEmail: "teste@example.test",
        variables: { nome: "Ana" },
        idempotencyKey,
      });

      expect(second.id).toBe(first.id);
      const all = await prisma.communication.findMany({ where: { idempotency_key: idempotencyKey } });
      expect(all).toHaveLength(1);
    } finally {
      await prisma.communication.deleteMany({ where: { idempotency_key: idempotencyKey } });
      await prisma.emailTemplate.delete({ where: { key } }).catch(() => {});
    }
  });
});

describe("processOutboxOnce", () => {
  it("sem RESEND_API_KEY configurada, marca como falhou com um erro claro (nunca finge sucesso)", async () => {
    const key = `test-template-fail-${Date.now()}`;
    await ensureTemplate(key);
    const idempotencyKey = `test-outbox-fail-${Date.now()}`;

    try {
      await enqueueCommunication({
        templateKey: key,
        recipientType: "cliente",
        recipientEmail: "teste@example.test",
        variables: { nome: "Ana" },
        idempotencyKey,
      });

      await processOutboxOnce();

      const communication = await prisma.communication.findUniqueOrThrow({
        where: { idempotency_key: idempotencyKey },
      });
      expect(communication.status).toBe("falhou");
      expect(communication.attempts).toBe(1);
      expect(communication.last_error).toContain("RESEND_API_KEY");
    } finally {
      await prisma.communication.deleteMany({ where: { idempotency_key: idempotencyKey } });
      await prisma.emailTemplate.delete({ where: { key } }).catch(() => {});
    }
  });

  it("para de tentar depois do limite de tentativas", async () => {
    const key = `test-template-limit-${Date.now()}`;
    await ensureTemplate(key);
    const idempotencyKey = `test-outbox-limit-${Date.now()}`;

    try {
      await enqueueCommunication({
        templateKey: key,
        recipientType: "cliente",
        recipientEmail: "teste@example.test",
        idempotencyKey,
      });

      for (let i = 0; i < 6; i++) {
        await processOutboxOnce();
      }

      const communication = await prisma.communication.findUniqueOrThrow({
        where: { idempotency_key: idempotencyKey },
      });
      expect(communication.attempts).toBe(5);
    } finally {
      await prisma.communication.deleteMany({ where: { idempotency_key: idempotencyKey } });
      await prisma.emailTemplate.delete({ where: { key } }).catch(() => {});
    }
  });
});

afterEach(async () => {
  // Rede de segurança: qualquer template de teste órfão criado nesta
  // suíte não deve sobreviver entre arquivos.
  await prisma.emailTemplate.deleteMany({ where: { key: { startsWith: "test-template-" } } });
});
