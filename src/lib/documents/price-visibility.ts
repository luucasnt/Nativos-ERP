import { prisma } from "@/lib/prisma";

type DocumentDefaults = { voucher_default: boolean; os_default: boolean };

// null = usa o padrão global definido em Configurações > Documentos
// (Setting "documentos_exibicao_valor", Fase 2); true/false = sobrepõe só
// para este voucher/OS.
export async function resolveShowPrice(
  override: boolean | null,
  key: keyof DocumentDefaults,
): Promise<boolean> {
  if (override !== null) {
    return override;
  }

  const setting = await prisma.setting.findUnique({ where: { key: "documentos_exibicao_valor" } });
  const value = setting?.value as DocumentDefaults | undefined;
  return value?.[key] ?? false;
}
