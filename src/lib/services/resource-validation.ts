import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resourceMatchesScope, type ExecutionType, type ResourceOwnership } from "./resource-scope";

type Assignment = { execution_type: ExecutionType; supplier_id: string | null; driver_id: string | null; vehicle_id: string | null };

export async function lockServiceResources(input: Assignment, db: Prisma.TransactionClient) {
  if (input.driver_id) await db.$queryRaw`SELECT id FROM drivers WHERE id = ${input.driver_id}::uuid FOR UPDATE`;
  if (input.vehicle_id) await db.$queryRaw`SELECT id FROM vehicles WHERE id = ${input.vehicle_id}::uuid FOR UPDATE`;
}

export async function assertSupplier(supplierId: string | null, db: Prisma.TransactionClient = prisma) {
  const supplier = supplierId ? await db.company.findUnique({ where: { id: supplierId }, select: { roles: true } }) : null;
  if (!supplier?.roles.includes("fornecedor")) throw new Error("Selecione uma empresa cadastrada como fornecedor.");
}

export async function assertServiceResources(input: Assignment, previous?: Assignment, db: Prisma.TransactionClient = prisma) {
  if (input.execution_type === "fornecedor") await assertSupplier(input.supplier_id, db);
  const [driver, vehicle] = await Promise.all([
    input.driver_id ? db.driver.findUnique({ where: { id: input.driver_id } }) : null,
    input.vehicle_id ? db.vehicle.findUnique({ where: { id: input.vehicle_id } }) : null,
  ]);
  const sameScope = previous?.execution_type === input.execution_type && previous?.supplier_id === input.supplier_id;
  for (const [id, resource, previousId, label] of [
    [input.driver_id, driver, previous?.driver_id, "Motorista"],
    [input.vehicle_id, vehicle, previous?.vehicle_id, "Veículo"],
  ] as const) {
    if (!id) continue;
    if (!resource || !resourceMatchesScope(resource, input.execution_type, input.supplier_id)) {
      throw new Error(`${label} deve pertencer ${input.execution_type === "propria" ? "à frota própria" : "ao fornecedor selecionado"}.`);
    }
    if ((!sameScope || previousId !== id) && (resource.status !== "ativo" || resource.approval_status !== "aprovado")) {
      throw new Error(`${label} deve estar ativo e aprovado para receber um serviço.`);
    }
  }
}

// Prevent a registration edit from breaking already assigned ongoing services.
// Completed/cancelled services remain historical records and are never rewritten.
export async function assertResourceRelinkAllowed(kind: "driver" | "vehicle", id: string, next: ResourceOwnership, db: Prisma.TransactionClient = prisma) {
  if (db !== prisma) {
    if (kind === "driver") await db.$queryRaw`SELECT id FROM drivers WHERE id = ${id}::uuid FOR UPDATE`;
    else await db.$queryRaw`SELECT id FROM vehicles WHERE id = ${id}::uuid FOR UPDATE`;
  }
  const current = kind === "driver" ? await db.driver.findUniqueOrThrow({ where: { id } }) : await db.vehicle.findUniqueOrThrow({ where: { id } });
  if (current.owner_type === next.owner_type && current.supplier_id === next.supplier_id) return;
  if (next.owner_type === "terceirizado") await assertSupplier(next.supplier_id, db);
  const incompatible = await db.service.count({
    where: {
      ...(kind === "driver" ? { driver_id: id } : { vehicle_id: id }),
      execution_status: { in: ["agendado", "em_andamento"] },
      acceptance_status: { not: "recusado" },
      reservation: { status: { notIn: ["cancelado", "rejeitado"] } },
      OR: next.owner_type === "proprio"
        ? [{ execution_type: { not: "propria" } }, { supplier_id: { not: null } }]
        : [{ execution_type: { not: "fornecedor" } }, { supplier_id: null }, { supplier_id: { not: next.supplier_id! } }],
    },
  });
  if (incompatible) throw new Error("Reatribua os serviços agendados ou em andamento antes de alterar o fornecedor ou a propriedade deste cadastro.");
}
