import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createInternalUserWithClient,
  createPortalUserWithClient,
  generateTemporaryPassword,
  resetTemporaryPasswordWithClient,
  syncAppMetadataWithClient,
} from "@/lib/auth/provisioning-core";
import { prisma } from "@/lib/prisma";

export { generateTemporaryPassword };

// Mantém app_metadata (usado pelo middleware, na borda) em sincronia com o
// registro Prisma `User` (fonte da verdade). Deve ser chamado sempre que um
// User for criado ou tiver um dos campos de autorização alterado.
export async function syncAppMetadata(userId: string) {
  return syncAppMetadataWithClient(createSupabaseAdminClient(), userId);
}

// Cria um login interno (admin/financeiro/operacional): usuário no Supabase
// Auth com senha temporária + registro correspondente em `users`.
export async function createInternalUser(input: Parameters<typeof createInternalUserWithClient>[1]) {
  return createInternalUserWithClient(createSupabaseAdminClient(), input);
}

// Cria um login de portal (parceiro/fornecedor por e-mail da Company, ou
// motorista por e-mail do Driver). Suporta o caso de dono-fornecedor que
// também dirige: um único User com linked_company_id e linked_driver_id
// preenchidos simultaneamente.
export async function createPortalUser(input: Parameters<typeof createPortalUserWithClient>[1]) {
  return createPortalUserWithClient(createSupabaseAdminClient(), input);
}

// Gera uma nova senha temporária para um login de portal (ou interno) já
// existente e força a troca no próximo acesso.
export async function resetTemporaryPassword(userId: string) {
  return resetTemporaryPasswordWithClient(createSupabaseAdminClient(), userId);
}

// Requisito adicional pós-Fase 1 (item 5 — "criação de login simplificada"):
// o dono de um fornecedor que também dirige (Driver.is_company_owner_driver)
// acumula os dois papéis num único login. Este helper resolve
// automaticamente o par (empresa, motorista) sempre que um dos dois já
// indica esse vínculo, e reaproveita um login existente em vez de criar um
// duplicado — criar acesso pelo lado da empresa ou pelo lado do motorista
// produz exatamente o mesmo resultado, sem fluxo duplicado.
export async function provisionCompanyOrDriverLogin(input: {
  companyId?: string;
  driverId?: string;
}) {
  let companyId = input.companyId ?? null;
  let driverId = input.driverId ?? null;

  if (driverId && !companyId) {
    const driver = await prisma.driver.findUniqueOrThrow({ where: { id: driverId } });
    if (driver.is_company_owner_driver && driver.supplier_id) {
      companyId = driver.supplier_id;
    }
  }

  if (companyId && !driverId) {
    const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId } });
    if (company.owner_driver_id) {
      driverId = company.owner_driver_id;
    } else {
      const ownerDriver = await prisma.driver.findFirst({
        where: { supplier_id: companyId, is_company_owner_driver: true, status: "ativo" },
        select: { id: true },
      });
      driverId = ownerDriver?.id ?? null;
    }
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        companyId ? { linked_company_id: companyId } : undefined,
        driverId ? { linked_driver_id: driverId } : undefined,
      ].filter((clause): clause is NonNullable<typeof clause> => Boolean(clause)),
    },
  });

  if (existingUser) {
    const updated = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        linked_company_id: companyId ?? existingUser.linked_company_id,
        linked_driver_id: driverId ?? existingUser.linked_driver_id,
      },
    });
    await syncAppMetadata(updated.id);
    return { created: false as const, user: updated };
  }

  const [company, driver] = await Promise.all([
    companyId ? prisma.company.findUniqueOrThrow({ where: { id: companyId } }) : null,
    driverId ? prisma.driver.findUniqueOrThrow({ where: { id: driverId } }) : null,
  ]);

  const email = company?.portal_email ?? driver?.portal_email;

  if (!email) {
    throw new Error(
      "Cadastre um e-mail de portal antes de criar o acesso (na empresa ou no motorista).",
    );
  }

  const created = await createPortalUser({
    email,
    nativeName: company?.name ?? driver?.name,
    linkedCompanyId: companyId ?? undefined,
    linkedDriverId: driverId ?? undefined,
  });

  return { created: true as const, user: created.user, temporaryPassword: created.temporaryPassword };
}
