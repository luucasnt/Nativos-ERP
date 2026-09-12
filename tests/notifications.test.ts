// Integração real (Postgres): sino de notificação dos portais (spec seção
// 7 — PortalNotification). Sem tabela protegida envolvida aqui — tudo é
// limpável normalmente no teardown.
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  getUnreadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notifyCompanyPortalUsers,
  notifyDriverPortalUser,
  notifyPortalUser,
} from "@/lib/notifications";

const prisma = new PrismaClient();

afterAll(async () => {
  await prisma.$disconnect();
});

async function createPortalUser(overrides: { linked_driver_id?: string; linked_company_id?: string } = {}) {
  return prisma.user.create({
    data: {
      auth_user_id: crypto.randomUUID(),
      email: `portal-notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.test`,
      account_type: "portal",
      status: "ativo",
      linked_driver_id: overrides.linked_driver_id,
      linked_company_id: overrides.linked_company_id,
    },
  });
}

async function cleanupUser(userId: string) {
  await prisma.portalNotification.deleteMany({ where: { user_id: userId } });
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
}

describe("sino de notificação dos portais", () => {
  it("notifyPortalUser cria um aviso não lido; getUnreadNotifications o retorna", async () => {
    const user = await createPortalUser();

    try {
      await notifyPortalUser({ userId: user.id, type: "servico_atribuido", message: "Novo serviço" });

      const unread = await getUnreadNotifications(user.id);
      expect(unread).toHaveLength(1);
      expect(unread[0].message).toBe("Novo serviço");
      expect(unread[0].read).toBe(false);
    } finally {
      await cleanupUser(user.id);
    }
  });

  it("markNotificationRead marca só o aviso indicado, respeitando o dono", async () => {
    const user = await createPortalUser();
    const other = await createPortalUser();

    try {
      await notifyPortalUser({ userId: user.id, type: "novo_servico", message: "A" });
      await notifyPortalUser({ userId: user.id, type: "novo_servico", message: "B" });
      const [first] = await getUnreadNotifications(user.id);

      // Um usuário não consegue marcar o aviso de outro como lido.
      await markNotificationRead(first.id, other.id);
      const stillUnread = await getUnreadNotifications(user.id);
      expect(stillUnread).toHaveLength(2);

      await markNotificationRead(first.id, user.id);
      const afterRead = await getUnreadNotifications(user.id);
      expect(afterRead).toHaveLength(1);
      expect(afterRead[0].id).not.toBe(first.id);
    } finally {
      await cleanupUser(user.id);
      await cleanupUser(other.id);
    }
  });

  it("markAllNotificationsRead zera os não lidos de um usuário", async () => {
    const user = await createPortalUser();

    try {
      await notifyPortalUser({ userId: user.id, type: "repasse_confirmado", message: "A" });
      await notifyPortalUser({ userId: user.id, type: "repasse_confirmado", message: "B" });

      await markAllNotificationsRead(user.id);

      const unread = await getUnreadNotifications(user.id);
      expect(unread).toHaveLength(0);
    } finally {
      await cleanupUser(user.id);
    }
  });

  it("notifyDriverPortalUser não faz nada (nem lança erro) quando o motorista não tem login de portal", async () => {
    const driver = await prisma.driver.create({
      data: { name: `Motorista Sem Portal ${Date.now()}`, owner_type: "proprio", payment_type: "diaria" },
    });

    try {
      await expect(
        notifyDriverPortalUser({ driverId: driver.id, type: "despesa_rejeitada", message: "x" }),
      ).resolves.not.toThrow();
    } finally {
      await prisma.driver.delete({ where: { id: driver.id } }).catch(() => {});
    }
  });

  it("notifyCompanyPortalUsers notifica todos os logins de portal vinculados à empresa", async () => {
    const company = await prisma.company.create({
      data: { name: `Empresa Notif ${Date.now()}`, roles: ["fornecedor"] },
    });
    const userA = await createPortalUser({ linked_company_id: company.id });
    const userB = await createPortalUser({ linked_company_id: company.id });

    try {
      await notifyCompanyPortalUsers({ companyId: company.id, type: "novo_servico", message: "Novo serviço" });

      const unreadA = await getUnreadNotifications(userA.id);
      const unreadB = await getUnreadNotifications(userB.id);
      expect(unreadA).toHaveLength(1);
      expect(unreadB).toHaveLength(1);
    } finally {
      await cleanupUser(userA.id);
      await cleanupUser(userB.id);
      await prisma.company.delete({ where: { id: company.id } }).catch(() => {});
    }
  });
});
