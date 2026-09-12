"use server";

import { revalidatePath } from "next/cache";
import { requireInternalUser } from "@/lib/auth/get-current-user";
import {
  provisionCompanyOrDriverLogin,
  resetTemporaryPassword,
} from "@/lib/auth/provision-user";
import { logAudit } from "@/lib/audit";

export type PortalLoginState = {
  error: string | null;
  temporaryPassword: string | null;
  email: string | null;
};

const emptyState: PortalLoginState = {
  error: null,
  temporaryPassword: null,
  email: null,
};

export async function createPortalLoginAction(
  kind: "company" | "driver",
  entityId: string,
  path: string,
  _prevState: PortalLoginState,
): Promise<PortalLoginState> {
  const user = await requireInternalUser();

  try {
    const result = await provisionCompanyOrDriverLogin(
      kind === "company" ? { companyId: entityId } : { driverId: entityId },
    );

    await logAudit({
      actorId: user.id,
      action: result.created ? "login_portal_criado" : "login_portal_vinculado",
      entityType: kind === "company" ? "company" : "driver",
      entityId,
    });

    revalidatePath(path);

    return {
      error: null,
      temporaryPassword: result.created ? result.temporaryPassword : null,
      email: result.user.email,
    };
  } catch (error) {
    return {
      ...emptyState,
      error: error instanceof Error ? error.message : "Falha ao criar o acesso.",
    };
  }
}

export async function resetPortalPasswordAction(
  userId: string,
  path: string,
  _prevState: PortalLoginState,
): Promise<PortalLoginState> {
  const user = await requireInternalUser();

  try {
    const { temporaryPassword } = await resetTemporaryPassword(userId);

    await logAudit({
      actorId: user.id,
      action: "senha_temporaria_gerada",
      entityType: "user",
      entityId: userId,
    });

    revalidatePath(path);

    return { error: null, temporaryPassword, email: null };
  } catch (error) {
    return {
      ...emptyState,
      error: error instanceof Error ? error.message : "Falha ao gerar nova senha.",
    };
  }
}
