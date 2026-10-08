"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { parseDriverForm } from "@/lib/drivers/form";
import { prisma } from "@/lib/prisma";
import { requireInternalUser } from "@/lib/auth/get-current-user";
import { logAudit } from "@/lib/audit";
import { deleteUnusedRecord, deletionError } from "@/lib/admin/delete-record";

export type DriverFormState = { error: string | null };

export async function createDriver(
  _prevState: DriverFormState,
  formData: FormData,
): Promise<DriverFormState> {
  const user = await requireInternalUser();
  const result = parseDriverForm(formData);

  if (!result.ok) {
    return { error: result.error };
  }

  // Cadastrado pela equipe interna: já nasce aprovado (o fluxo de
  // aprovação existe para cadastros vindos do portal do fornecedor).
  const driver = await prisma.driver.create({
    data: {
      ...result.data,
      approval_status: "aprovado",
      created_from_portal: false,
      reviewed_by_id: user.id,
    },
  });

  await logAudit({
    actorId: user.id,
    action: "motorista_criado",
    entityType: "driver",
    entityId: driver.id,
  });

  revalidatePath("/admin/motoristas");
  redirect("/admin/motoristas");
}

export async function updateDriver(
  id: string,
  _prevState: DriverFormState,
  formData: FormData,
): Promise<DriverFormState> {
  const user = await requireInternalUser();
  const result = parseDriverForm(formData);

  if (!result.ok) {
    return { error: result.error };
  }

  await prisma.driver.update({ where: { id }, data: result.data });

  await logAudit({
    actorId: user.id,
    action: "motorista_atualizado",
    entityType: "driver",
    entityId: id,
  });

  revalidatePath("/admin/motoristas");
  redirect("/admin/motoristas");
}

export async function approveDriver(id: string) {
  const user = await requireInternalUser();

  await prisma.driver.update({
    where: { id },
    data: { approval_status: "aprovado", status: "ativo", reviewed_by_id: user.id },
  });

  await logAudit({
    actorId: user.id,
    action: "motorista_aprovado",
    entityType: "driver",
    entityId: id,
  });

  revalidatePath("/admin/motoristas");
  revalidatePath("/admin/aprovacoes");
  revalidatePath(`/admin/motoristas/${id}`);
}

export async function rejectDriver(id: string) {
  const user = await requireInternalUser();

  await prisma.driver.update({
    where: { id },
    data: { approval_status: "rejeitado", status: "inativo", reviewed_by_id: user.id },
  });

  await logAudit({
    actorId: user.id,
    action: "motorista_rejeitado",
    entityType: "driver",
    entityId: id,
  });

  revalidatePath("/admin/motoristas");
  revalidatePath("/admin/aprovacoes");
  revalidatePath(`/admin/motoristas/${id}`);
}

export async function setDriverStatus(id: string, status: "ativo" | "inativo") {
  const user = await requireInternalUser();

  await prisma.driver.update({ where: { id }, data: { status } });

  await logAudit({
    actorId: user.id,
    action: status === "ativo" ? "motorista_ativado" : "motorista_desativado",
    entityType: "driver",
    entityId: id,
  });

  revalidatePath("/admin/motoristas");
  revalidatePath(`/admin/motoristas/${id}`);
}
export async function deleteDriver(id: string): Promise<{ error?: string | null }> {
  const user = await requireInternalUser();
  try {
    await deleteUnusedRecord("driver", id, user.id);
  } catch (error) {
    return { error: deletionError(error) };
  }
  revalidatePath("/admin/motoristas");
  return {};
}
