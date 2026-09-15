import { prisma } from "@/lib/prisma";
import { tableClass, tdClass, thClass } from "@/lib/ui";
import { ArchiveAlertButton } from "@/components/admin/archive-alert-button";

const SEVERITY_LABEL: Record<string, string> = {
  info: "Informativo",
  atencao: "Atenção",
  critico: "Crítico",
};

const SEVERITY_CLASS: Record<string, string> = {
  info: "bg-forest/10 text-forest",
  atencao: "bg-gold/20 text-forest",
  critico: "bg-red-100 text-red-700",
};

export default async function AlertasPage() {
  const alerts = await prisma.alert.findMany({
    where: { archived: false },
    orderBy: [{ severity: "desc" }, { created_at: "desc" }],
    take: 100,
  });

  return (
    <div>
      <h1 className="mb-2 font-serif text-3xl text-forest">Alertas</h1>
      <p className="mb-6 text-forest/60">
        Painel de exceções internas (spec seção 7). Alertas críticos não
        desaparecem sozinhos — precisam ser arquivados manualmente depois de
        resolvidos.
      </p>

      {alerts.length === 0 ? (
        <p className="text-forest/60">Nenhum alerta ativo.</p>
      ) : (
        <>
          <ul className="grid gap-3 xl:hidden">
            {alerts.map((alert) => (
              <li key={alert.id} className="surface-panel p-4">
                <div className="flex items-start justify-between gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${SEVERITY_CLASS[alert.severity]}`}>
                    {SEVERITY_LABEL[alert.severity]}
                  </span>
                  <time className="text-[11px] text-forest/55">{alert.created_at.toLocaleString("pt-BR")}</time>
                </div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-forest/62">{alert.type}</p>
                <p className="mt-2 text-sm leading-6 text-ink">{alert.message}</p>
                <div className="mt-4"><ArchiveAlertButton alertId={alert.id} /></div>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto xl:block">
            <table className={tableClass}>
          <thead>
            <tr>
              <th className={thClass}>Severidade</th>
              <th className={thClass}>Tipo</th>
              <th className={thClass}>Mensagem</th>
              <th className={thClass}>Criado em</th>
              <th className={thClass}></th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((a) => (
              <tr key={a.id}>
                <td className={tdClass}>
                  <span className={`rounded-sm px-1.5 py-0.5 text-xs ${SEVERITY_CLASS[a.severity]}`}>
                    {SEVERITY_LABEL[a.severity]}
                  </span>
                </td>
                <td className={tdClass}>{a.type}</td>
                <td className={tdClass}>{a.message}</td>
                <td className={tdClass}>{a.created_at.toLocaleString("pt-BR")}</td>
                <td className={tdClass}>
                  <ArchiveAlertButton alertId={a.id} />
                </td>
              </tr>
            ))}
          </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
