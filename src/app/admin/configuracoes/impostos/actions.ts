"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireInternalUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

const PATH = "/admin/configuracoes/impostos";

const schema = z.object({
  percentual: z
    .string()
    .optional()
    .transform((v) => (v ? v.trim() : ""))
    .refine((v) => v === "" || !Number.isNaN(Number(v)), "Percentual inválido."),
});

export type TaxSettingsState = { error: string | null; saved: boolean };

// Nunca preenche um valor "de fábrica" — o campo fica vazio (null) até o
// admin definir. Deixar em branco aqui volta a alíquota padrão para
// indefinida (reservas sem alíquota própria deixam de calcular imposto).
export async function updateTaxSettings(
  _prevState: TaxSettingsState,
  formData: FormData,
): Promise<TaxSettingsState> {
  const user = await requireInternalUser();

  const parsed = schema.safeParse({ percentual: formData.get("percentual") });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos.", saved: false };
  }

  const percentual = parsed.data.percentual === "" ? null : Number(parsed.data.percentual);

  await prisma.setting.upsert({
    where: { key: "imposto_padrao" },
    update: { value: { percentual } },
    create: { key: "imposto_padrao", category: "financeiro", value: { percentual } },
  });

  await logAudit({
    actorId: user.id,
    action: "configuracao_imposto_padrao_atualizada",
    entityType: "other",
    metadata: { percentual },
  });

  revalidatePath(PATH);
  return { error: null, saved: true };
}
