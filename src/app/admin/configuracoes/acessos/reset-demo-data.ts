"use server";

import { revalidatePath } from "next/cache";
import { requireOwnerUser } from "@/lib/auth/get-current-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

const TEST_DATA_TABLES = [
  "payments", "finance_entries", "service_expenses", "services", "reservations",
  "billing_cycle_reservations", "billing_cycles", "change_requests", "direct_collections",
  "compensations", "client_credits", "portal_notifications", "alerts", "audit_logs",
  "communications", "cash_closings", "vehicle_expense_policies", "clients", "vehicles",
  "bank_accounts", "commission_defaults", "contract_clauses", "email_templates", "settings",
] as const;

export async function resetDemoData() {
  const actor = await requireOwnerUser();

  // The owner account itself is the sole record intentionally preserved.
  await prisma.user.update({
    where: { id: actor.id },
    data: { linked_company_id: null, linked_driver_id: null },
  });

  // Delete operational/demo data in dependency-safe order. Migrations and schema objects are untouched.
  for (const table of TEST_DATA_TABLES) {
    await prisma.$executeRawUnsafe(`DELETE FROM public."${table}"`);
  }

  // Remove remaining reviewer links before deleting non-owner users.
  await prisma.$executeRawUnsafe(`UPDATE public."vehicles" SET "reviewed_by_id" = NULL`);
  await prisma.$executeRawUnsafe(`UPDATE public."drivers" SET "reviewed_by_id" = NULL`);
  await prisma.user.deleteMany({ where: { id: { not: actor.id } } });
  await prisma.$executeRawUnsafe(`UPDATE public."companies" SET "owner_driver_id" = NULL`);
  await prisma.$executeRawUnsafe(`UPDATE public."drivers" SET "supplier_id" = NULL`);
  await prisma.$executeRawUnsafe(`DELETE FROM public."companies"`);
  await prisma.$executeRawUnsafe(`DELETE FROM public."drivers"`);
  await prisma.$executeRawUnsafe(`DELETE FROM public."catalog_items"`);

  // Remove every Supabase Auth test login except the currently authenticated owner.
  const admin = createSupabaseAdminClient();
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Falha ao listar usuários do Supabase Auth: ${error.message}`);
    const users = data.users ?? [];
    for (const authUser of users) {
      if (authUser.id === actor.auth_user_id) continue;
      const { error: deleteError } = await admin.auth.admin.deleteUser(authUser.id, false);
      if (deleteError) throw new Error(`Falha ao remover acesso ${authUser.email ?? authUser.id}: ${deleteError.message}`);
    }
    if (users.length < perPage) break;
    page += 1;
  }

  await logAudit({
    actorId: actor.id,
    action: "sistema_zerado_dados_demo_removidos",
    entityType: "other",
    entityId: actor.id,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/configuracoes/acessos");
  return { ok: true };
}
