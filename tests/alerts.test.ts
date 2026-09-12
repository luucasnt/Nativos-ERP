// Integração real (Postgres): Alert (spec seção 7) — idempotente por
// dedupe_key, nunca duplica, e "archived" só muda por ação humana
// (archiveAlert). Alert não é uma das 4 tabelas protegidas, então é
// limpável normalmente no teardown.
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { archiveAlert, createAlert } from "@/lib/alerts";

const prisma = new PrismaClient();

afterAll(async () => {
  await prisma.$disconnect();
});

async function cleanupAlert(id: string) {
  await prisma.alert.delete({ where: { id } }).catch(() => {});
}

describe("createAlert", () => {
  it("cria um alerta novo com os dados informados", async () => {
    const dedupeKey = `test-alert-${Date.now()}`;
    const alert = await createAlert({
      type: "sem_motorista",
      severity: "atencao",
      message: "Teste",
      dedupeKey,
    });

    try {
      expect(alert.severity).toBe("atencao");
      expect(alert.archived).toBe(false);
    } finally {
      await cleanupAlert(alert.id);
    }
  });

  it("chamar de novo com o mesmo dedupe_key não duplica — atualiza o existente", async () => {
    const dedupeKey = `test-alert-dup-${Date.now()}`;
    const first = await createAlert({ type: "sem_veiculo", severity: "atencao", message: "A", dedupeKey });

    try {
      const second = await createAlert({ type: "sem_veiculo", severity: "critico", message: "B", dedupeKey });

      expect(second.id).toBe(first.id);
      expect(second.severity).toBe("critico");
      expect(second.message).toBe("B");

      const all = await prisma.alert.findMany({ where: { dedupe_key: dedupeKey } });
      expect(all).toHaveLength(1);
    } finally {
      await cleanupAlert(first.id);
    }
  });

  it("um alerta arquivado reabre (em vez de colidir com a constraint) se a condição recorrer", async () => {
    const dedupeKey = `test-alert-reopen-${Date.now()}`;
    const first = await createAlert({ type: "bagagem_incompativel", severity: "info", message: "A", dedupeKey });

    try {
      const actor = await prisma.user.create({
        data: {
          auth_user_id: crypto.randomUUID(),
          email: `alert-actor-${Date.now()}@example.test`,
          account_type: "internal",
          internal_role: "operacional",
        },
      });

      try {
        await archiveAlert(first.id, actor.id);
        const archived = await prisma.alert.findUniqueOrThrow({ where: { id: first.id } });
        expect(archived.archived).toBe(true);

        const reopened = await createAlert({ type: "bagagem_incompativel", severity: "info", message: "B", dedupeKey });
        expect(reopened.id).toBe(first.id);
        expect(reopened.archived).toBe(false);
        expect(reopened.message).toBe("B");
      } finally {
        await prisma.user.delete({ where: { id: actor.id } }).catch(() => {});
      }
    } finally {
      await cleanupAlert(first.id);
    }
  });
});
