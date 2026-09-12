import { prisma } from "@/lib/prisma";
import { tableClass, tdClass, thClass } from "@/lib/ui";
import { ProcessOutboxButton } from "@/components/admin/process-outbox-button";

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  enviando: "Enviando",
  enviado: "Enviado",
  falhou: "Falhou",
  cancelado: "Cancelado",
};

export default async function OutboxPage() {
  const communications = await prisma.communication.findMany({
    orderBy: { created_at: "desc" },
    take: 100,
  });

  const hasResendConfigured = Boolean(process.env.RESEND_API_KEY);

  return (
    <div>
      <h1 className="mb-2 font-serif text-3xl text-forest">Fila de e-mail (outbox)</h1>
      <p className="mb-4 max-w-2xl text-sm text-forest/60">
        Todo e-mail transacional passa por aqui antes de ser enviado — nunca
        é disparado direto na hora do evento. Um cron externo (a cada 5min
        em produção, ver <code>vercel.json</code>) processa a fila; o botão
        abaixo processa manualmente.
      </p>
      {!hasResendConfigured && (
        <p className="mb-4 max-w-2xl rounded-sm bg-gold/10 p-3 text-sm text-forest">
          RESEND_API_KEY não configurada nesta sessão — os e-mails ficam
          enfileirados e marcados como falha ao tentar processar. Configure
          uma conta Resend real para o envio efetivo funcionar.
        </p>
      )}
      <div className="mb-6">
        <ProcessOutboxButton />
      </div>

      {communications.length === 0 ? (
        <p className="text-forest/60">Nenhum e-mail enfileirado ainda.</p>
      ) : (
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={thClass}>Template</th>
              <th className={thClass}>Destinatário</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Tentativas</th>
              <th className={thClass}>Último erro</th>
              <th className={thClass}>Criado em</th>
            </tr>
          </thead>
          <tbody>
            {communications.map((c) => (
              <tr key={c.id}>
                <td className={tdClass}>{c.template_key}</td>
                <td className={tdClass}>{c.recipient_email}</td>
                <td className={tdClass}>{STATUS_LABEL[c.status]}</td>
                <td className={tdClass}>{c.attempts}</td>
                <td className={`${tdClass} max-w-xs truncate`} title={c.last_error ?? ""}>
                  {c.last_error ?? "—"}
                </td>
                <td className={tdClass}>{c.created_at.toLocaleString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
