"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInternalUser } from "@/lib/auth/get-current-user";
import { logAudit } from "@/lib/audit";

const decimalField = z
  .string()
  .optional()
  .transform((v) => (v ? v.trim() : ""))
  .refine((v) => v === "" || !Number.isNaN(Number(v)), "Valor numérico inválido.");

const driverSchema = z.object({
  name: z.string().min(1, "Informe o nome."),
  document: z.string().optional(),
  email: z.string().email("E-mail inválido.").optional().or(z.literal("")),
  phone: z.string().optional(),
  owner_type: z.enum(["proprio", "terceirizado"]),
  supplier_id: z.string().uuid().optional().or(z.literal("")),
  is_company_owner_driver: z.enum(["on"]).optional(),
  payment_type: z.enum(["diaria", "comissao", "salario_mensal", "mesclado"]),
  commission: decimalField,
  daily_rate: decimalField,
  salario_mensal: decimalField,
  portal_email: z.string().email("E-mail inválido.").optional().or(z.literal("")),
});

export type DriverFormState = { error: string | null };

function toDecimalOrNull(value: string) {
  return value === "" ? null : value;
}

function parseDriverForm(formData: FormData) {
  const parsed = driverSchema.safeParse({
    name: formData.get("name"),
    document: formData.get("document") || undefined,
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    owner_type: formData.get("owner_type"),
    supplier_id: formData.get("supplier_id") || undefined,
    is_company_owner_driver: formData.get("is_company_owner_driver") || undefined,
    payment_type: formData.get("payment_type"),
    commission: formData.get("commission") || undefined,
    daily_rate: formData.get("daily_rate") || undefined,
    salario_mensal: formData.get("salario_mensal") || undefined,
    portal_email: formData.get("portal_email") || undefined,
  });

  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const d = parsed.data;

  if (d.owner_type === "terceirizado" && !d.supplier_id) {
    return { ok: false as const, error: "Selecione o fornecedor deste motorista terceirizado." };
  }

  return {
    ok: true as const,
    data: {
      name: d.name,
      document: d.document || null,
      email: d.email || null,
      phone: d.phone || null,
      owner_type: d.owner_type,
      supplier_id: d.owner_type === "terceirizado" ? d.supplier_id || null : null,
      is_company_owner_driver: d.owner_type === "terceirizado" && d.is_company_owner_driver === "on",
      payment_type: d.payment_type,
      commission: toDecimalOrNull(d.commission),
      daily_rate: toDecimalOrNull(d.daily_rate),
      salario_mensal: toDecimalOrNull(d.salario_mensal),
      portal_email: d.portal_email || null,
    },
  };
}

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
