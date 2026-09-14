"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInternalUser } from "@/lib/auth/get-current-user";
import { logAudit } from "@/lib/audit";

const vehicleSchema = z.object({
  plate: z.string().min(1, "Informe a placa."),
  model: z.string().min(1, "Informe o modelo."),
  category_id: z.string().uuid().optional().or(z.literal("")),
  capacity: z
    .string()
    .min(1, "Informe a capacidade.")
    .refine((v) => Number.isInteger(Number(v)) && Number(v) > 0, "Capacidade inválida."),
  owner_type: z.enum(["proprio", "terceirizado"]),
  supplier_id: z.string().uuid().optional().or(z.literal("")),
  status: z.enum(["ativo", "manutencao", "inativo"]),
  initial_odometer_km: z.string().optional(),
});

export type VehicleFormState = { error: string | null };

function parseVehicleForm(formData: FormData) {
  const parsed = vehicleSchema.safeParse({
    plate: formData.get("plate"),
    model: formData.get("model"),
    category_id: formData.get("category_id") || undefined,
    capacity: formData.get("capacity"),
    owner_type: formData.get("owner_type"),
    supplier_id: formData.get("supplier_id") || undefined,
    status: formData.get("status"),
    initial_odometer_km: formData.get("initial_odometer_km") || undefined,
  });

  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const d = parsed.data;

  if (d.owner_type === "terceirizado" && !d.supplier_id) {
    return { ok: false as const, error: "Selecione o fornecedor deste veículo terceirizado." };
  }
  const initialKm = d.initial_odometer_km ? Number(d.initial_odometer_km) : null;
  if (d.owner_type === "proprio" && (initialKm === null || !Number.isInteger(initialKm) || initialKm < 0)) {
    return { ok: false as const, error: "Informe o KM atual do veículo próprio." };
  }

  return {
    ok: true as const,
    data: {
      plate: d.plate.toUpperCase(),
      model: d.model,
      category_id: d.category_id || null,
      capacity: Number(d.capacity),
      owner_type: d.owner_type,
      supplier_id: d.owner_type === "terceirizado" ? d.supplier_id || null : null,
      status: d.status,
      initial_odometer_km: initialKm,
      odometer_updated_at: initialKm === null ? null : new Date(),
    },
  };
}

export async function createVehicle(
  _prevState: VehicleFormState,
  formData: FormData,
): Promise<VehicleFormState> {
  const user = await requireInternalUser();
  const result = parseVehicleForm(formData);

  if (!result.ok) {
    return { error: result.error };
  }

  const vehicle = await prisma.vehicle.create({
    data: {
      ...result.data,
      approval_status: "aprovado",
      created_from_portal: false,
      reviewed_by_id: user.id,
    },
  });

  await logAudit({
    actorId: user.id,
    action: "veiculo_criado",
    entityType: "vehicle",
    entityId: vehicle.id,
  });

  revalidatePath("/admin/veiculos");
  redirect("/admin/veiculos");
}

export async function updateVehicle(
  id: string,
  _prevState: VehicleFormState,
  formData: FormData,
): Promise<VehicleFormState> {
  const user = await requireInternalUser();
  const result = parseVehicleForm(formData);

  if (!result.ok) {
    return { error: result.error };
  }

  await prisma.vehicle.update({ where: { id }, data: result.data });

  await logAudit({
    actorId: user.id,
    action: "veiculo_atualizado",
    entityType: "vehicle",
    entityId: id,
  });

  revalidatePath("/admin/veiculos");
  redirect("/admin/veiculos");
}

export async function approveVehicle(id: string) {
  const user = await requireInternalUser();

  await prisma.vehicle.update({
    where: { id },
    data: { approval_status: "aprovado", status: "ativo", reviewed_by_id: user.id },
  });

  await logAudit({
    actorId: user.id,
    action: "veiculo_aprovado",
    entityType: "vehicle",
    entityId: id,
  });

  revalidatePath("/admin/veiculos");
  revalidatePath("/admin/aprovacoes");
  revalidatePath(`/admin/veiculos/${id}`);
}

export async function rejectVehicle(id: string) {
  const user = await requireInternalUser();

  await prisma.vehicle.update({
    where: { id },
    data: { approval_status: "rejeitado", status: "inativo", reviewed_by_id: user.id },
  });

  await logAudit({
    actorId: user.id,
    action: "veiculo_rejeitado",
    entityType: "vehicle",
    entityId: id,
  });

  revalidatePath("/admin/veiculos");
  revalidatePath("/admin/aprovacoes");
  revalidatePath(`/admin/veiculos/${id}`);
}
