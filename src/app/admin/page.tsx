import { KpiTile } from "@/components/admin/dashboard/kpi-tile";
import { Panel } from "@/components/admin/dashboard/panel";
import { WeekChart } from "@/components/admin/dashboard/week-chart";
import { FinanceList } from "@/components/admin/dashboard/finance-list";
import { AlertsPanel } from "@/components/admin/dashboard/alerts-panel";
import { SolicitacoesTable } from "@/components/admin/dashboard/solicitacoes-table";
import { OperacoesHojeTable } from "@/components/admin/dashboard/operacoes-hoje-table";
import { formatCurrency } from "@/lib/documents/format";
import { loadAdminDashboardData } from "./dashboard-data";

export default async function AdminHomePage() {
  const data = await loadAdminDashboardData();

  return (
    <div>
      <div className="mb-3.5 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <KpiTile
          label="Reservas hoje"
          value={String(data.kpis.reservasHoje)}
          delta={
            data.kpis.reservasHojeDelta !== 0
              ? `${data.kpis.reservasHojeDelta > 0 ? "+" : ""}${data.kpis.reservasHojeDelta} vs. ontem`
              : undefined
          }
        />
        <KpiTile label="Em andamento agora" value={String(data.kpis.emAndamentoAgora)} accent="moss" />
        <KpiTile label="Faturamento do dia" value={formatCurrency(data.kpis.faturamentoHoje)} accent="gold" />
        <KpiTile label="Alertas críticos" value={String(data.kpis.alertasCriticos)} accent="danger" />
      </div>

      <Panel title="Operações de hoje" meta={`${data.operacoesHoje.length} serviços programados`}>
        <OperacoesHojeTable rows={data.operacoesHoje} />
      </Panel>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Panel title="Reservas — últimos 7 dias">
          <WeekChart days={data.last7Days} />
        </Panel>
        <Panel title="Financeiro">
          <FinanceList {...data.financeiro} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Panel title="Alertas">
          <AlertsPanel alerts={data.alertas} />
        </Panel>
        <Panel title="Solicitações pendentes">
          <SolicitacoesTable requests={data.solicitacoes} />
        </Panel>
      </div>
    </div>
  );
}
