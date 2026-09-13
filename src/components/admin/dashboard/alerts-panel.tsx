import type { Alert } from "@prisma/client";
import { alertCategoryLabel } from "@/lib/alerts/labels";
import { formatRelativeTime } from "@/lib/format-relative-time";

const SEVERITY_STYLE: Record<Alert["severity"], { label: string; className: string }> = {
  critico: { label: "Alto", className: "bg-brick-100 text-brick-500" },
  atencao: { label: "Médio", className: "bg-ochre-100 text-ochre-500" },
  info: { label: "Baixo", className: "bg-gray-100 text-ink-500" },
};

export function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) {
    return <p className="px-5 py-6 text-sm text-ink-500">Nenhum alerta ativo no momento.</p>;
  }

  return (
    <div>
      {alerts.map((alert) => {
        const severity = SEVERITY_STYLE[alert.severity];
        return (
          <div key={alert.id} className="flex items-start gap-3 border-b border-border px-5 py-3 last:border-b-0">
            <span
              className={`mt-px shrink-0 rounded-[3px] px-[7px] py-0.5 text-[10.5px] font-bold ${severity.className}`}
            >
              {severity.label}
            </span>
            <div>
              <p className="mb-0.5 text-[13px] text-ink-900">{alert.message}</p>
              <span className="text-[11.5px] text-ink-500">
                {alertCategoryLabel(alert.type)} · {formatRelativeTime(alert.created_at)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
