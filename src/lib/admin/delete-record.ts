import { Prisma, type EntityRefType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

type RecordKind = "client" | "company" | "driver" | "vehicle" | "reservation" | "service" | "catalog" | "bank";
const tables: Record<RecordKind, string> = {
  client: "clients", company: "companies", driver: "drivers", vehicle: "vehicles",
  reservation: "reservations", service: "services", catalog: "catalog_items", bank: "bank_accounts",
};

// Optional foreign keys use SET NULL in the existing schema. Check every
// relationship before deleting so historical records never lose their owner.
// Polymorphic references have no FK and must also be checked explicitly.
export async function deleteUnusedRecord(kind: RecordKind, id: string, actorId: string, reservationId?: string) {
  z.string().uuid().parse(id);
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id FROM ${Prisma.raw(tables[kind])} WHERE id = ${id}::uuid FOR UPDATE
    `);
    if (!rows.length) throw new Error("Registro não encontrado.");

    let snapshot: Prisma.InputJsonValue;
    let linked = false;
    switch (kind) {
      case "client": {
        const r = await tx.client.findUniqueOrThrow({ where: { id }, include: { _count: { select: { reservations: true, client_credits: true } } } });
        linked = Object.values(r._count).some(Boolean);
        snapshot = { name: r.name };
        break;
      }
      case "company": {
        const r = await tx.company.findUniqueOrThrow({ where: { id }, include: { _count: { select: { users: true, clients_originated: true, drivers_as_supplier: true, vehicles_as_supplier: true, reservations_as_partner: true, services_as_supplier: true, billing_cycles: true, change_requests: true } } } });
        linked = Boolean(r.owner_driver_id) || !r.saldo_conta_corrente.isZero() || Object.values(r._count).some(Boolean);
        snapshot = { name: r.name };
        break;
      }
      case "driver": {
        const r = await tx.driver.findUniqueOrThrow({ where: { id }, include: { user: true, _count: { select: { services: true, service_expenses: true, owner_of_companies: true } } } });
        linked = Boolean(r.user) || Object.values(r._count).some(Boolean);
        snapshot = { name: r.name };
        break;
      }
      case "vehicle": {
        const r = await tx.vehicle.findUniqueOrThrow({ where: { id }, include: { _count: { select: { services: true, service_expenses: true } } } });
        linked = Object.values(r._count).some(Boolean);
        snapshot = { plate: r.plate, model: r.model };
        break;
      }
      case "reservation": {
        const r = await tx.reservation.findUniqueOrThrow({ where: { id }, include: { _count: { select: { services: true, finance_entries: true, billing_cycle_reservations: true, change_requests: true } } } });
        linked = Object.values(r._count).some(Boolean) || !["rascunho", "pendente"].includes(r.status);
        snapshot = { code: r.code };
        break;
      }
      case "service": {
        const r = await tx.service.findUniqueOrThrow({ where: { id }, include: { _count: { select: { finance_entries: true, service_expenses: true, direct_collections: true } } } });
        if (r.reservation_id !== reservationId) throw new Error("O serviço não pertence a esta reserva.");
        linked = Object.values(r._count).some(Boolean) || r.execution_status !== "agendado" || Boolean(r.started_at || r.completed_at);
        snapshot = { reservation_id: r.reservation_id, type: r.type };
        break;
      }
      case "catalog": {
        const r = await tx.catalogItem.findUniqueOrThrow({ where: { id }, include: { _count: { select: { reservations_by_category: true, services_by_category: true, services_by_upgrade: true, vehicles_by_category: true, companies_by_category: true, services_by_pacote_disposicao: true, service_expenses_by_category: true, direct_collections_by_reason: true } } } });
        linked = Object.values(r._count).some(Boolean) || Boolean(await tx.commissionDefault.findFirst({ where: { target: "company", category_key: r.key } }));
        snapshot = { key: r.key, label: r.label };
        break;
      }
      case "bank": {
        const r = await tx.bankAccount.findUniqueOrThrow({ where: { id }, include: { _count: { select: { payments: true, cash_closings: true } } } });
        linked = Object.values(r._count).some(Boolean);
        snapshot = { name: r.name };
        break;
      }
    }

    if (["client", "company", "driver"].includes(kind)) {
      const partyTypes = kind === "client" ? ["cliente"] : kind === "driver" ? ["motorista"] : ["parceiro", "fornecedor"];
      const referrerType = kind === "client" ? "client" : kind === "driver" ? "driver" : "company";
      const [entry, referrer, request, collection, compensation] = await Promise.all([
        tx.financeEntry.findFirst({ where: { party_id: id, party_type: { in: partyTypes as ("cliente" | "motorista" | "parceiro" | "fornecedor")[] } }, select: { id: true } }),
        tx.reservation.findFirst({ where: { referrer_id: id, referrer_type: referrerType }, select: { id: true } }),
        tx.changeRequest.findFirst({ where: { requester_id: id }, select: { id: true } }),
        tx.directCollection.findFirst({ where: { OR: [{ receiver_id: id }, { financial_responsible_id: id }] }, select: { id: true } }),
        tx.compensation.findFirst({ where: { counterparty_id: id }, select: { id: true } }),
      ]);
      linked ||= Boolean(entry || referrer || request || collection || compensation);
    }
    if (linked) throw new Error("Este registro possui vínculos ou histórico. Preserve o cadastro; use desativação ou cancelamento quando disponível.");

    // These references are historical too, even though the database has no FK.
    const entityType: EntityRefType = ["catalog", "bank"].includes(kind) ? "other" : kind as EntityRefType;
    const [alert, notification] = await Promise.all([
      tx.alert.findFirst({ where: { entity_ref_type: entityType, entity_ref_id: id }, select: { id: true } }),
      tx.portalNotification.findFirst({ where: { entity_ref_type: entityType, entity_ref_id: id }, select: { id: true } }),
    ]);
    if (alert || notification) throw new Error("Este registro possui alertas ou notificações no histórico e não pode ser excluído.");

    switch (kind) {
      case "client": await tx.client.delete({ where: { id } }); break;
      case "company": await tx.company.delete({ where: { id } }); break;
      case "driver": await tx.driver.delete({ where: { id } }); break;
      case "vehicle": await tx.vehicle.delete({ where: { id } }); break;
      case "reservation": await tx.reservation.delete({ where: { id } }); break;
      case "service": await tx.service.delete({ where: { id } }); break;
      case "catalog": await tx.catalogItem.delete({ where: { id } }); break;
      case "bank": await tx.bankAccount.delete({ where: { id } }); break;
    }
    await tx.auditLog.create({ data: { actor_id: actorId, action: `${kind}_excluido`, entity_type: entityType, entity_id: id, metadata: snapshot } });
  }, { isolationLevel: "Serializable" });
}

export function deletionError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2003") return "Existe um vínculo com outro registro. A exclusão foi bloqueada.";
    if (error.code === "P2034") return "O registro mudou durante a operação. Atualize a página e tente novamente.";
    return "Não foi possível excluir o registro. Nenhuma exclusão foi confirmada.";
  }
  return error instanceof Error ? error.message : "Não foi possível excluir o registro.";
}
