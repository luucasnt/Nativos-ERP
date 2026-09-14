import { requireInternalUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { CompanySettingsForm } from "./form";

export default async function EmpresaSettingsPage() {
  await requireInternalUser();
  const setting = await prisma.setting.findUnique({ where: { key: "empresa_dados" } });
  const value = (setting?.value as Record<string, string> | undefined) ?? {};
  return <div><h1 className="mb-2 font-serif text-3xl text-forest">Dados da Nativos</h1><p className="mb-6 max-w-2xl text-sm text-forest/60">Esses dados aparecem nos documentos, recibos, contratos e comunicações oficiais.</p><CompanySettingsForm defaults={value} /></div>;
}
