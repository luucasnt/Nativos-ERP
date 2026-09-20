import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { sendEmailManuallyAction } from "../actions";
import { buttonClass, inputClass, labelClass, secondaryButtonClass } from "@/lib/ui";

export default async function SendEmailPage() {
  const templates = await prisma.emailTemplate.findMany({ where: { active: true }, orderBy: { key: "asc" } });

  return (
    <div className="max-w-3xl">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-gold">Disparo autorizado</p>
      <h1 className="font-serif text-3xl text-forest">Enviar e-mail manualmente</h1>
      <p className="mt-2 mb-7 max-w-2xl text-sm leading-6 text-forest/65">
        O envio só acontece ao confirmar este formulário. O sistema registra o disparo no outbox e no histórico de auditoria.
      </p>

      <form action={sendEmailManuallyAction} className="surface-panel flex flex-col gap-5 p-5 sm:p-7">
        <div className="flex flex-col gap-1">
          <label htmlFor="reservationCode" className={labelClass}>Reserva relacionada</label>
          <input id="reservationCode" name="reservationCode" placeholder="NAT-2026-0148" className={inputClass} />
          <p className="text-xs leading-5 text-forest/55">Obrigatória para voucher, operação, cobrança, pagamento e documentos. No voucher, o sistema escolhe automaticamente passageiro ou parceiro conforme o relacionamento da reserva.</p>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="templateKey" className={labelClass}>Modelo *</label>
          <select id="templateKey" name="templateKey" required className={inputClass}>
            {templates.map((template) => <option key={template.key} value={template.key}>{template.name} · {template.subject}</option>)}
          </select>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="recipientType" className={labelClass}>Tipo de destinatário *</label>
            <select id="recipientType" name="recipientType" required defaultValue="parceiro" className={inputClass}>
              <option value="parceiro">Parceiro</option><option value="fornecedor">Fornecedor</option><option value="motorista">Motorista</option><option value="cliente">Passageiro — somente voucher</option><option value="interno">Interno</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="recipientEmail" className={labelClass}>E-mail</label>
            <input id="recipientEmail" name="recipientEmail" type="email" placeholder="parceiro@exemplo.com" className={inputClass} />
            <p className="text-xs leading-5 text-forest/55">No voucher, o destinatário é definido automaticamente pela reserva. Nos demais modelos, informe o e-mail vinculado.</p>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="variables" className={labelClass}>Dados do modelo</label>
          <textarea id="variables" name="variables" rows={8} className={`${inputClass} font-mono text-xs`} placeholder={'nome=Mariana Almeida\ncodigo_reserva=NAT-2026-0148\ndata_servico=18/09/2026\nlink=https://nativos-erp.vercel.app'} />
          <p className="text-xs leading-5 text-forest/55">Use uma variável por linha no formato <code>chave=valor</code>. As variáveis disponíveis ficam no modelo.</p>
        </div>
        <div className="rounded-lg border border-gold/25 bg-gold/10 p-3 text-sm leading-5 text-forest/75">
          Revise o destinatário, o assunto e o conteúdo antes de confirmar. O botão abaixo é o único gatilho de envio.
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="submit" className={`${buttonClass} w-full sm:w-auto`}>Enviar agora</button>
          <Link href="/admin/configuracoes/emails/preview" className={`${secondaryButtonClass} w-full sm:w-auto`}>Ver prévias</Link>
        </div>
      </form>
    </div>
  );
}
