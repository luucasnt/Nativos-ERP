import { z } from "zod";

const decimalField = z
  .string()
  .optional()
  .transform((v) => (v ? v.trim().replace(",", ".") : ""))
  .refine((v) => v === "" || (/^\d{1,10}(\.\d{1,2})?$/.test(v) && Number.isFinite(Number(v))), "Valor numérico inválido.");

const driverSchema = z.object({
  name: z.string().min(1, "Informe o nome."),
  document: z.string().optional(),
  email: z.string().email("E-mail inválido.").optional().or(z.literal("")),
  phone: z.string().optional(),
  owner_type: z.enum(["proprio", "terceirizado"]),
  supplier_id: z.string().uuid().optional().or(z.literal("")),
  is_company_owner_driver: z.enum(["on"]).optional(),
  payment_type: z.enum(["diaria", "comissao", "salario_mensal", "mesclado"]).optional(),
  commission: decimalField,
  daily_rate: decimalField,
  salario_mensal: decimalField,
  portal_email: z.string().email("E-mail inválido.").optional().or(z.literal("")),
});

function toDecimalOrNull(value: string) {
  return value === "" ? null : value;
}

export function parseDriverForm(formData: FormData) {
  const parsed = driverSchema.safeParse({
    name: formData.get("name"),
    document: formData.get("document") || undefined,
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    owner_type: formData.get("owner_type"),
    supplier_id: formData.get("supplier_id") || undefined,
    is_company_owner_driver: formData.get("is_company_owner_driver") || undefined,
    payment_type: formData.get("owner_type") === "terceirizado" ? undefined : formData.get("payment_type") || undefined,
    commission: formData.get("owner_type") === "terceirizado" ? undefined : formData.get("commission") || undefined,
    daily_rate: formData.get("owner_type") === "terceirizado" ? undefined : formData.get("daily_rate") || undefined,
    salario_mensal: formData.get("owner_type") === "terceirizado" ? undefined : formData.get("salario_mensal") || undefined,
    portal_email: formData.get("portal_email") || undefined,
  });

  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const d = parsed.data;

  if (d.owner_type === "terceirizado" && !d.supplier_id) {
    return { ok: false as const, error: "Selecione o fornecedor deste motorista terceirizado." };
  }

  if (d.owner_type === "proprio" && !d.payment_type) return { ok: false as const, error: "Selecione a forma de pagamento do motorista próprio." };

  const commission = d.commission === "" ? null : Number(d.commission);
  const dailyRate = d.daily_rate === "" ? null : Number(d.daily_rate);
  if ((d.payment_type === "comissao" || d.payment_type === "mesclado") && (commission === null || commission <= 0 || commission > 100)) {
    return { ok: false as const, error: "Informe uma comissão entre 0,01% e 100%." };
  }
  if ((d.payment_type === "diaria" || d.payment_type === "mesclado") && (dailyRate === null || dailyRate <= 0)) {
    return { ok: false as const, error: "Informe o valor da diária." };
  }

  if (d.payment_type === "salario_mensal" && !(Number(d.salario_mensal) > 0)) return { ok: false as const, error: "Informe o salário mensal." };

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
      payment_type: d.owner_type === "proprio" ? d.payment_type! : null,
      commission: d.owner_type === "proprio" ? toDecimalOrNull(d.commission) : null,
      daily_rate: d.owner_type === "proprio" ? toDecimalOrNull(d.daily_rate) : null,
      salario_mensal: d.owner_type === "proprio" ? toDecimalOrNull(d.salario_mensal) : null,
      portal_email: d.portal_email || null,
    },
  };
}

