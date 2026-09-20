import Link from "next/link";
import { DEFAULT_EMAIL_TEMPLATES, EMAIL_PREVIEW_VARIABLES } from "@/lib/communication/default-templates";
import { secondaryButtonClass } from "@/lib/ui";
import { renderTemplate } from "@/lib/communication/render-template";

export default function EmailPreviewPage() {
  return (
    <div className="pb-12">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-gold">Prévia visual</p>
          <h1 className="font-serif text-3xl text-forest">Modelos de e-mail Nativos</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-forest/65">
            Estes são os modelos transacionais. Eles ficam disponíveis para envio manual e só saem quando você confirmar o disparo.
          </p>
        </div>
        <Link href="/admin/configuracoes/emails" className={secondaryButtonClass}>Voltar aos templates</Link>
      </div>

      <div className="grid gap-8">
        {DEFAULT_EMAIL_TEMPLATES.map((template) => (
          <article key={template.key} className="overflow-hidden rounded-2xl border border-forest/10 bg-[#f5f4ef] shadow-sm">
            <div className="flex flex-col gap-2 border-b border-forest/10 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-forest">{template.name}</h2>
                <p className="mt-1 text-xs text-forest/55">{template.key} · {template.subject}</p>
              </div>
              <span className="w-fit rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold text-[#806a3c]">Envio manual</span>
            </div>
            <div className="p-3 sm:p-6">
              <div dangerouslySetInnerHTML={{ __html: renderTemplate(template.body, EMAIL_PREVIEW_VARIABLES) }} />
            </div>
          </article>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-forest/10 bg-white p-5 text-sm leading-6 text-forest/70">
        <strong className="text-forest">Variáveis de demonstração:</strong> os dados exibidos acima são fictícios e serão substituídos pelos dados reais da reserva, cliente, parceiro, fornecedor ou motorista no momento do envio.
      </div>
    </div>
  );
}
