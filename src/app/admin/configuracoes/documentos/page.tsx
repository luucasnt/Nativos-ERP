import { prisma } from "@/lib/prisma";
import { DocumentSettingsForm } from "./document-settings-form";

type DocumentDefaults = { voucher_default: boolean; os_default: boolean };

export default async function DocumentosSettingsPage() {
  const setting = await prisma.setting.findUnique({
    where: { key: "documentos_exibicao_valor" },
  });

  const value = (setting?.value as DocumentDefaults | undefined) ?? {
    voucher_default: false,
    os_default: false,
  };

  return (
    <div>
      <h1 className="mb-2 font-serif text-3xl text-forest">Documentos</h1>
      <p className="mb-6 max-w-lg text-sm text-forest/60">
        Padrão de exibição de valor: por padrão, o passageiro e o motorista
        não veem o valor do serviço em voucher/ordem de serviço, a menos que
        você habilite aqui.
      </p>
      <DocumentSettingsForm
        voucherDefault={value.voucher_default}
        osDefault={value.os_default}
      />
    </div>
  );
}
