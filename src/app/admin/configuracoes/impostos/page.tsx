import { prisma } from "@/lib/prisma";
import { TaxSettingsForm } from "./tax-settings-form";

type TaxSetting = { percentual: number | null };

export default async function ImpostosSettingsPage() {
  const setting = await prisma.setting.findUnique({ where: { key: "imposto_padrao" } });
  const value = setting?.value as TaxSetting | undefined;

  return (
    <div>
      <h1 className="mb-2 font-serif text-3xl text-forest">Impostos</h1>
      <p className="mb-6 max-w-lg text-sm text-forest/60">
        Alíquota padrão usada para calcular imposto/NF de reservas com nota
        fiscal exigida. Não há valor de fábrica — o cálculo só acontece
        depois que você definir uma alíquota aqui ou diretamente em uma
        reserva específica.
      </p>
      <TaxSettingsForm percentual={value?.percentual ?? null} />
    </div>
  );
}
