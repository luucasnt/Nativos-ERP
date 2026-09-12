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

const intField = z
  .string()
  .optional()
  .transform((v) => (v ? v.trim() : ""))
  .refine((v) => v === "" || Number.isInteger(Number(v)), "Valor inteiro inválido.");

const companySchema = z.object({
  name: z.string().min(1, "Informe o nome."),
  document: z.string().optional(),
  legal_person: z.enum(["pj", "pf"]),
  contact_name: z.string().optional(),
  contact_email: z.string().email("E-mail inválido.").optional().or(z.literal("")),
  contact_phone: z.string().optional(),
  roles: z.array(z.enum(["parceiro", "fornecedor"])).min(1, "Selecione ao menos um papel."),
  portal_email: z.string().email("E-mail inválido.").optional().or(z.literal("")),
  category_id: z.string().uuid().optional().or(z.literal("")),
  modelo_parceiro: z.enum(["comissionado", "faturado", "ambos"]).optional().or(z.literal("")),
  billing_enabled: z.enum(["on"]).optional(),
  billing_limit: decimalField,
  closing_day: intField,
  invoice_due_day: intField,
  requires_nf: z.enum(["on"]).optional(),
  net_enabled: z.enum(["on"]).optional(),
  commission_enabled: z.enum(["on"]).optional(),
  commission: decimalField,
  pix_key: z.string().optional(),
  pix_key_type: z.enum(["cpf", "cnpj", "email", "telefone", "aleatoria"]).optional().or(z.literal("")),
  pix_favorecido_name: z.string().optional(),
  recebe_pagamento_direto: z.enum(["on"]).optional(),
  direct_collection_settlement_mode: z
    .enum(["retain_supplier_cost", "gross_repass"])
    .optional()
    .or(z.literal("")),
  limite_inadimplencia: decimalField,
});

export type CompanyFormState = { error: string | null };

function toDecimalOrNull(value: string) {
  return value === "" ? null : value;
}

function toIntOrNull(value: string) {
  return value === "" ? null : Number(value);
}

function parseCompanyForm(formData: FormData) {
  const parsed = companySchema.safeParse({
    name: formData.get("name"),
    document: formData.get("document") || undefined,
    legal_person: formData.get("legal_person"),
    contact_name: formData.get("contact_name") || undefined,
    contact_email: formData.get("contact_email") || undefined,
    contact_phone: formData.get("contact_phone") || undefined,
    roles: formData.getAll("roles"),
    portal_email: formData.get("portal_email") || undefined,
    category_id: formData.get("category_id") || undefined,
    modelo_parceiro: formData.get("modelo_parceiro") || undefined,
    billing_enabled: formData.get("billing_enabled") || undefined,
    billing_limit: formData.get("billing_limit") || undefined,
    closing_day: formData.get("closing_day") || undefined,
    invoice_due_day: formData.get("invoice_due_day") || undefined,
    requires_nf: formData.get("requires_nf") || undefined,
    net_enabled: formData.get("net_enabled") || undefined,
    commission_enabled: formData.get("commission_enabled") || undefined,
    commission: formData.get("commission") || undefined,
    pix_key: formData.get("pix_key") || undefined,
    pix_key_type: formData.get("pix_key_type") || undefined,
    pix_favorecido_name: formData.get("pix_favorecido_name") || undefined,
    recebe_pagamento_direto: formData.get("recebe_pagamento_direto") || undefined,
    direct_collection_settlement_mode:
      formData.get("direct_collection_settlement_mode") || undefined,
    limite_inadimplencia: formData.get("limite_inadimplencia") || undefined,
  });

  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const d = parsed.data;

  if (d.roles.includes("fornecedor") && d.recebe_pagamento_direto === "on" && !d.direct_collection_settlement_mode) {
    return {
      ok: false as const,
      error: "Selecione o modo de liquidação de pagamento direto.",
    };
  }

  return {
    ok: true as const,
    data: {
      name: d.name,
      document: d.document || null,
      legal_person: d.legal_person === "pj",
      contact_name: d.contact_name || null,
      contact_email: d.contact_email || null,
      contact_phone: d.contact_phone || null,
      roles: d.roles,
      portal_email: d.portal_email || null,
      category_id: d.category_id || null,
      modelo_parceiro: d.modelo_parceiro || null,
      billing_enabled: d.billing_enabled === "on",
      billing_limit: toDecimalOrNull(d.billing_limit),
      closing_day: toIntOrNull(d.closing_day),
      invoice_due_day: toIntOrNull(d.invoice_due_day),
      requires_nf: d.requires_nf === "on",
      net_enabled: d.net_enabled === "on",
      commission_enabled: d.commission_enabled === "on",
      commission: toDecimalOrNull(d.commission),
      pix_key: d.pix_key || null,
      pix_key_type: d.pix_key_type || null,
      pix_favorecido_name: d.pix_favorecido_name || null,
      recebe_pagamento_direto: d.recebe_pagamento_direto === "on",
      direct_collection_settlement_mode: d.direct_collection_settlement_mode || null,
      limite_inadimplencia: toDecimalOrNull(d.limite_inadimplencia),
    },
  };
}

export async function createCompany(
  _prevState: CompanyFormState,
  formData: FormData,
): Promise<CompanyFormState> {
  const user = await requireInternalUser();
  const result = parseCompanyForm(formData);

  if (!result.ok) {
    return { error: result.error };
  }

  const company = await prisma.company.create({ data: result.data });

  await logAudit({
    actorId: user.id,
    action: "empresa_criada",
    entityType: "company",
    entityId: company.id,
  });

  revalidatePath("/admin/empresas");
  redirect("/admin/empresas");
}

export async function updateCompany(
  id: string,
  _prevState: CompanyFormState,
  formData: FormData,
): Promise<CompanyFormState> {
  const user = await requireInternalUser();
  const result = parseCompanyForm(formData);

  if (!result.ok) {
    return { error: result.error };
  }

  await prisma.company.update({ where: { id }, data: result.data });

  await logAudit({
    actorId: user.id,
    action: "empresa_atualizada",
    entityType: "company",
    entityId: id,
  });

  revalidatePath("/admin/empresas");
  redirect("/admin/empresas");
}
