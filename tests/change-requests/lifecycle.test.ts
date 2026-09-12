// Integração real (Postgres): ChangeRequest (spec seção 7) — submissão
// idempotente por dedupe_key, protocolo sequencial, e revisão do admin
// notificando o requerente certo (empresa ou motorista).
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { submitChangeRequest } from "@/lib/change-requests/submit";
import { reviewChangeRequest } from "@/lib/change-requests/review";
import { getUnreadNotifications } from "@/lib/notifications";

const prisma = new PrismaClient();

afterAll(async () => {
  await prisma.$disconnect();
});

async function cleanupChangeRequest(id: string) {
  await prisma.changeRequest.delete({ where: { id } }).catch(() => {});
}

describe("submitChangeRequest", () => {
  it("gera protocolo no formato SOL-{ano}-{sequencial} e é idempotente por dedupe_key", async () => {
    const dedupeKey = `test-cr-${Date.now()}`;
    const client = await prisma.client.create({ data: { name: `Cliente CR ${Date.now()}`, origin: "proprio" } });

    try {
      const first = await submitChangeRequest({
        type: "nova_reserva",
        requesterType: "driver",
        requesterId: client.id, // qualquer uuid válido serve para o teste de protocolo/dedupe
        allocationDetails: { descricao: "teste" },
        dedupeKey,
      });

      expect(first.protocol).toMatch(/^SOL-\d{4}-\d{6}$/);
      expect(first.category).toBe("operacional");

      const second = await submitChangeRequest({
        type: "nova_reserva",
        requesterType: "driver",
        requesterId: client.id,
        allocationDetails: { descricao: "teste" },
        dedupeKey,
      });

      expect(second.id).toBe(first.id);
      expect(second.protocol).toBe(first.protocol);

      const all = await prisma.changeRequest.findMany({ where: { dedupe_key: dedupeKey } });
      expect(all).toHaveLength(1);

      await cleanupChangeRequest(first.id);
    } finally {
      await prisma.client.delete({ where: { id: client.id } }).catch(() => {});
    }
  });

  it("repasse_nativos é classificado como financeiro", async () => {
    const dedupeKey = `test-cr-repasse-${Date.now()}`;
    const driver = await prisma.driver.create({
      data: { name: `Motorista CR ${Date.now()}`, owner_type: "proprio", payment_type: "diaria" },
    });

    try {
      const cr = await submitChangeRequest({
        type: "repasse_nativos",
        requesterType: "driver",
        requesterId: driver.id,
        allocationDetails: { entry_ids: [], nota: "teste" },
        dedupeKey,
      });

      expect(cr.category).toBe("financeiro");
      await cleanupChangeRequest(cr.id);
    } finally {
      await prisma.driver.delete({ where: { id: driver.id } }).catch(() => {});
    }
  });
});

describe("reviewChangeRequest", () => {
  it("empresa: aprovar uma alteração notifica com o tipo alteracao_aprovada", async () => {
    const company = await prisma.company.create({
      data: { name: `Parceiro CR ${Date.now()}`, roles: ["parceiro"] },
    });
    const portalUser = await prisma.user.create({
      data: {
        auth_user_id: crypto.randomUUID(),
        email: `cr-empresa-${Date.now()}@example.test`,
        account_type: "portal",
        status: "ativo",
        linked_company_id: company.id,
      },
    });
    const reviewer = await prisma.user.create({
      data: {
        auth_user_id: crypto.randomUUID(),
        email: `cr-revisor-${Date.now()}@example.test`,
        account_type: "internal",
        internal_role: "operacional",
      },
    });

    try {
      const cr = await submitChangeRequest({
        type: "alteracao",
        requesterType: "company",
        requesterId: company.id,
        companyId: company.id,
        allocationDetails: { descricao: "trocar horário" },
        dedupeKey: `test-cr-review-${Date.now()}`,
      });

      const reviewed = await reviewChangeRequest({
        id: cr.id,
        status: "aprovada",
        reviewerId: reviewer.id,
        responseNote: "Feito",
      });

      expect(reviewed.status).toBe("aprovada");
      expect(reviewed.reviewed_by_id).toBe(reviewer.id);
      expect(reviewed.response_note).toBe("Feito");

      const unread = await getUnreadNotifications(portalUser.id);
      expect(unread).toHaveLength(1);
      expect(unread[0].type).toBe("alteracao_aprovada");

      await cleanupChangeRequest(cr.id);
    } finally {
      await prisma.portalNotification.deleteMany({ where: { user_id: portalUser.id } });
      await prisma.communication.deleteMany({ where: { recipient_email: portalUser.email } });
      await prisma.user.delete({ where: { id: portalUser.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: reviewer.id } }).catch(() => {});
      await prisma.company.delete({ where: { id: company.id } }).catch(() => {});
    }
  });

  it("motorista: rejeitar um repasse notifica com o tipo solicitacao_atualizada (fallback)", async () => {
    const driver = await prisma.driver.create({
      data: { name: `Motorista CR Review ${Date.now()}`, owner_type: "proprio", payment_type: "diaria" },
    });
    const portalUser = await prisma.user.create({
      data: {
        auth_user_id: crypto.randomUUID(),
        email: `cr-motorista-${Date.now()}@example.test`,
        account_type: "portal",
        status: "ativo",
        linked_driver_id: driver.id,
      },
    });
    const reviewer = await prisma.user.create({
      data: {
        auth_user_id: crypto.randomUUID(),
        email: `cr-revisor2-${Date.now()}@example.test`,
        account_type: "internal",
        internal_role: "financeiro",
      },
    });

    try {
      const cr = await submitChangeRequest({
        type: "repasse_nativos",
        requesterType: "driver",
        requesterId: driver.id,
        allocationDetails: { entry_ids: [] },
        dedupeKey: `test-cr-review2-${Date.now()}`,
      });

      await reviewChangeRequest({
        id: cr.id,
        status: "rejeitada",
        reviewerId: reviewer.id,
        responseNote: "Sem lançamento pendente",
      });

      const unread = await getUnreadNotifications(portalUser.id);
      expect(unread).toHaveLength(1);
      expect(unread[0].type).toBe("solicitacao_atualizada");

      await cleanupChangeRequest(cr.id);
    } finally {
      await prisma.portalNotification.deleteMany({ where: { user_id: portalUser.id } });
      await prisma.user.delete({ where: { id: portalUser.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: reviewer.id } }).catch(() => {});
      await prisma.driver.delete({ where: { id: driver.id } }).catch(() => {});
    }
  });
});
