// Integração real (Postgres): gatilhos automáticos de Alert que não
// exigem threshold inventado nem job agendado (ver src/lib/alerts/detectors.ts).
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { checkPartnerBillingLimit, detectDriverVehicleConflict } from "@/lib/alerts/detectors";

const prisma = new PrismaClient();

afterAll(async () => {
  await prisma.$disconnect();
});

async function cleanupAlertsFor(dedupeKeyPrefix: string) {
  await prisma.alert.deleteMany({ where: { dedupe_key: { startsWith: dedupeKeyPrefix } } });
}

describe("detectDriverVehicleConflict", () => {
  it("cria um alerta crítico quando dois serviços têm o mesmo motorista, data e horário", async () => {
    const client = await prisma.client.create({ data: { name: `Cliente Conflito ${Date.now()}`, origin: "proprio" } });
    const reservation = await prisma.reservation.create({
      data: { code: `CONFLITO-${Date.now()}`, client_id: client.id, collection_mode: "nativos" },
    });
    const driver = await prisma.driver.create({
      data: { name: `Motorista Conflito ${Date.now()}`, owner_type: "proprio", payment_type: "diaria" },
    });
    const scheduledDate = new Date("2026-08-01T00:00:00Z");

    const serviceA = await prisma.service.create({
      data: {
        reservation_id: reservation.id,
        type: "transfer_chegada",
        execution_type: "propria",
        driver_id: driver.id,
        scheduled_date: scheduledDate,
        scheduled_time: "14:00",
        original_price: 500,
        price: 500,
        acceptance_status: "aceito",
      },
    });
    const serviceB = await prisma.service.create({
      data: {
        reservation_id: reservation.id,
        type: "transfer_saida",
        execution_type: "propria",
        driver_id: driver.id,
        scheduled_date: scheduledDate,
        scheduled_time: "14:00",
        original_price: 500,
        price: 500,
        acceptance_status: "aceito",
      },
    });

    try {
      await detectDriverVehicleConflict(serviceB.id);

      const alerts = await prisma.alert.findMany({ where: { type: "conflito_motorista_veiculo" } });
      const relevant = alerts.find((a) => a.dedupe_key?.includes(serviceA.id) && a.dedupe_key?.includes(serviceB.id));
      expect(relevant).toBeDefined();
      expect(relevant?.severity).toBe("critico");
      expect(relevant?.persistent).toBe(true);

      if (relevant) {
        await cleanupAlertsFor(relevant.dedupe_key!);
      }
    } finally {
      await prisma.service.delete({ where: { id: serviceA.id } }).catch(() => {});
      await prisma.service.delete({ where: { id: serviceB.id } }).catch(() => {});
      await prisma.reservation.delete({ where: { id: reservation.id } }).catch(() => {});
      await prisma.client.delete({ where: { id: client.id } }).catch(() => {});
      await prisma.driver.delete({ where: { id: driver.id } }).catch(() => {});
    }
  });

  it("não cria alerta quando os horários são diferentes", async () => {
    const client = await prisma.client.create({ data: { name: `Cliente Sem Conflito ${Date.now()}`, origin: "proprio" } });
    const reservation = await prisma.reservation.create({
      data: { code: `SEMCONFLITO-${Date.now()}`, client_id: client.id, collection_mode: "nativos" },
    });
    const driver = await prisma.driver.create({
      data: { name: `Motorista Sem Conflito ${Date.now()}`, owner_type: "proprio", payment_type: "diaria" },
    });
    const scheduledDate = new Date("2026-08-02T00:00:00Z");

    const serviceA = await prisma.service.create({
      data: {
        reservation_id: reservation.id,
        type: "transfer_chegada",
        execution_type: "propria",
        driver_id: driver.id,
        scheduled_date: scheduledDate,
        scheduled_time: "09:00",
        original_price: 500,
        price: 500,
        acceptance_status: "aceito",
      },
    });
    const serviceB = await prisma.service.create({
      data: {
        reservation_id: reservation.id,
        type: "transfer_saida",
        execution_type: "propria",
        driver_id: driver.id,
        scheduled_date: scheduledDate,
        scheduled_time: "18:00",
        original_price: 500,
        price: 500,
        acceptance_status: "aceito",
      },
    });

    try {
      await detectDriverVehicleConflict(serviceB.id);

      const alerts = await prisma.alert.findMany({ where: { type: "conflito_motorista_veiculo" } });
      const relevant = alerts.find((a) => a.dedupe_key?.includes(serviceA.id) || a.dedupe_key?.includes(serviceB.id));
      expect(relevant).toBeUndefined();
    } finally {
      await prisma.service.delete({ where: { id: serviceA.id } }).catch(() => {});
      await prisma.service.delete({ where: { id: serviceB.id } }).catch(() => {});
      await prisma.reservation.delete({ where: { id: reservation.id } }).catch(() => {});
      await prisma.client.delete({ where: { id: client.id } }).catch(() => {});
      await prisma.driver.delete({ where: { id: driver.id } }).catch(() => {});
    }
  });
});

describe("checkPartnerBillingLimit", () => {
  it("cria um alerta crítico quando o saldo em aberto do parceiro atinge o limite", async () => {
    const company = await prisma.company.create({
      data: { name: `Parceiro Limite ${Date.now()}`, roles: ["parceiro"], billing_enabled: true, billing_limit: 1000 },
    });

    try {
      await prisma.financeEntry.create({
        data: {
          type: "receita",
          category: "venda_servico",
          status: "pendente",
          payment_eligible: true,
          amount: 1200,
          party_type: "parceiro",
          party_id: company.id,
          origin_type: "manual",
          auto_key: `test-billing-limit-${Date.now()}`,
        },
      });

      await checkPartnerBillingLimit(company.id);

      const alert = await prisma.alert.findUnique({ where: { dedupe_key: `parceiro_acima_limite:${company.id}` } });
      expect(alert).not.toBeNull();
      expect(alert?.severity).toBe("critico");

      if (alert) {
        await prisma.alert.delete({ where: { id: alert.id } }).catch(() => {});
      }
    } finally {
      await prisma.company.delete({ where: { id: company.id } }).catch(() => {});
    }
  });

  it("não cria alerta quando o saldo está abaixo do limite", async () => {
    const company = await prisma.company.create({
      data: { name: `Parceiro Dentro Limite ${Date.now()}`, roles: ["parceiro"], billing_enabled: true, billing_limit: 1000 },
    });

    try {
      await prisma.financeEntry.create({
        data: {
          type: "receita",
          category: "venda_servico",
          status: "pendente",
          payment_eligible: true,
          amount: 300,
          party_type: "parceiro",
          party_id: company.id,
          origin_type: "manual",
          auto_key: `test-billing-ok-${Date.now()}`,
        },
      });

      await checkPartnerBillingLimit(company.id);

      const alert = await prisma.alert.findUnique({ where: { dedupe_key: `parceiro_acima_limite:${company.id}` } });
      expect(alert).toBeNull();
    } finally {
      await prisma.company.delete({ where: { id: company.id } }).catch(() => {});
    }
  });
});
