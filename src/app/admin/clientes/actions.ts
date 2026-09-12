"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireInternalUser } from "@/lib/auth/get-current-user";
import { logAudit } from "@/lib/audit";

const clientSchema = z.object({
  name: z.string().min(1, "Informe o nome."),
  document: z.string().optional(),
  email: z.string().email("E-mail inválido.").optional().or(z.literal("")),
  phone: z.string().optional(),
  origin: z.enum(["proprio", "parceiro"]),
  origin_partner_id: z.string().uuid().optional().or(z.literal("")),
});

export type ClientFormState = { error: string | null };

type ClientData = {
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  origin: "proprio" | "parceiro";
  origin_partner_id: string | null;
};

function parseClientForm(
  formData: FormData,
): { ok: false; error: string } | { ok: true; data: ClientData } {
  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    document: formData.get("document") || undefined,
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    origin: formData.get("origin"),
    origin_partner_id: formData.get("origin_partner_id") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  if (parsed.data.origin === "parceiro" && !parsed.data.origin_partner_id) {
    return { ok: false, error: "Selecione o parceiro de origem." };
  }

  return {
    ok: true,
    data: {
      name: parsed.data.name,
      document: parsed.data.document || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      origin: parsed.data.origin,
      origin_partner_id:
        parsed.data.origin === "parceiro" ? parsed.data.origin_partner_id! : null,
    },
  };
}

export async function createClient(
  _prevState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const user = await requireInternalUser();
  const result = parseClientForm(formData);

  if (!result.ok) {
    return { error: result.error };
  }

  const client = await prisma.client.create({ data: result.data });

  await logAudit({
    actorId: user.id,
    action: "cliente_criado",
    entityType: "client",
    entityId: client.id,
  });

  revalidatePath("/admin/clientes");
  redirect("/admin/clientes");
}

export async function updateClient(
  id: string,
  _prevState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const user = await requireInternalUser();
  const result = parseClientForm(formData);

  if (!result.ok) {
    return { error: result.error };
  }

  await prisma.client.update({ where: { id }, data: result.data });

  await logAudit({
    actorId: user.id,
    action: "cliente_atualizado",
    entityType: "client",
    entityId: id,
  });

  revalidatePath("/admin/clientes");
  redirect("/admin/clientes");
}
