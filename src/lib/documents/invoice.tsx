import { StyleSheet, Text, View } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { BRAND_COLORS } from "@/lib/documents/brand";
import { DocumentShell } from "@/lib/documents/components/document-shell";
import {
  DetailGrid,
  DocumentHero,
  NoticeBox,
  SectionHeading,
  TotalPanel,
} from "@/lib/documents/components/pdf-ui";
import { formatCurrency, formatDate } from "@/lib/documents/format";

const styles = StyleSheet.create({
  table: {
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BRAND_COLORS.line,
    borderRadius: 4,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    backgroundColor: BRAND_COLORS.forest,
    color: BRAND_COLORS.cream,
  },
  row: {
    flexDirection: "row",
    minHeight: 36,
    borderTopWidth: 1,
    borderTopColor: BRAND_COLORS.line,
    alignItems: "center",
  },
  cell: {
    paddingHorizontal: 7,
    paddingVertical: 7,
    fontSize: 7.5,
  },
  headerCell: {
    paddingHorizontal: 7,
    paddingVertical: 7,
    fontSize: 6.5,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  code: { width: "17%" },
  passenger: { width: "31%" },
  services: { width: "13%", textAlign: "center" },
  date: { width: "19%" },
  amount: { width: "20%", textAlign: "right" },
});

const STATUS_LABEL: Record<string, string> = {
  aberto: "Em aberto",
  fechado: "Fechado",
  faturado: "Faturado",
  parcialmente_pago: "Parcialmente pago",
  pago: "Pago",
  vencido: "Vencido",
};

function billingDueDate(period: string, closingDay: number, dueDay: number) {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const monthOffset = dueDay <= closingDay ? 1 : 0;
  return new Date(Date.UTC(year, monthIndex + monthOffset, dueDay));
}

function formatPeriod(period: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) return period;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1)).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  });
}

export async function loadInvoiceData(billingCycleId: string) {
  const [billingCycle, bankAccount] = await Promise.all([
    prisma.billingCycle.findUniqueOrThrow({
      where: { id: billingCycleId },
      include: {
        company: true,
        reservations: {
          orderBy: { created_at: "asc" },
          include: {
            reservation: {
              include: {
                client: true,
                services: {
                  where: { execution_status: { not: "cancelado" } },
                  orderBy: { scheduled_date: "asc" },
                },
              },
            },
          },
        },
      },
    }),
    prisma.bankAccount.findFirst({
      where: { active: true },
      orderBy: { created_at: "asc" },
    }),
  ]);

  return { billingCycle, bankAccount };
}

export function InvoiceDocument({ data }: { data: Awaited<ReturnType<typeof loadInvoiceData>> }) {
  const { billingCycle: cycle, bankAccount } = data;
  const dueDate = billingDueDate(cycle.period, cycle.closing_day, cycle.due_day);
  const remaining = Math.max(0, Number(cycle.total_amount) - Number(cycle.paid_amount));

  return (
    <DocumentShell
      title="Fatura de serviços"
      documentCode={"FAT-" + cycle.id.slice(0, 8).toUpperCase()}
      issuedAt={cycle.updated_at}
    >
      <DocumentHero
        kicker="Faturamento"
        title={cycle.company.name}
        description={"Competência " + formatPeriod(cycle.period)}
      />

      <DetailGrid
        columns={3}
        items={[
          {
            label: "Documento",
            value: cycle.company.document ?? "Não informado",
          },
          {
            label: "Vencimento",
            value: dueDate ? formatDate(dueDate) : "Dia " + cycle.due_day,
          },
          {
            label: "Status",
            value: STATUS_LABEL[cycle.status] ?? cycle.status,
          },
          {
            label: "Fechamento",
            value: "Dia " + cycle.closing_day,
          },
          {
            label: "Valor pago",
            value: formatCurrency(cycle.paid_amount),
          },
          {
            label: "Saldo em aberto",
            value: formatCurrency(remaining),
          },
        ]}
      />

      <SectionHeading>Reservas faturadas</SectionHeading>
      {cycle.reservations.length === 0 ? (
        <Text style={{ marginBottom: 12, color: BRAND_COLORS.muted }}>
          Nenhuma reserva foi vinculada a este ciclo.
        </Text>
      ) : (
        <View style={styles.table}>
          <View style={styles.header} wrap={false}>
            <Text style={[styles.headerCell, styles.code]}>Reserva</Text>
            <Text style={[styles.headerCell, styles.passenger]}>Passageiro</Text>
            <Text style={[styles.headerCell, styles.services]}>Serviços</Text>
            <Text style={[styles.headerCell, styles.date]}>Criação</Text>
            <Text style={[styles.headerCell, styles.amount]}>Valor</Text>
          </View>
          {cycle.reservations.map(({ reservation }) => {
            const amount = reservation.services.reduce(
              (total, service) => total + Number(service.price),
              0,
            );
            return (
              <View key={reservation.id} style={styles.row} wrap={false}>
                <Text style={[styles.cell, styles.code]}>{reservation.code}</Text>
                <Text style={[styles.cell, styles.passenger]}>{reservation.client.name}</Text>
                <Text style={[styles.cell, styles.services]}>{reservation.services.length}</Text>
                <Text style={[styles.cell, styles.date]}>{formatDate(reservation.created_at)}</Text>
                <Text style={[styles.cell, styles.amount]}>{formatCurrency(amount)}</Text>
              </View>
            );
          })}
        </View>
      )}

      <TotalPanel
        label="Total da fatura"
        value={formatCurrency(cycle.total_amount)}
        note={remaining > 0 ? "Saldo em aberto: " + formatCurrency(remaining) : "Fatura integralmente liquidada."}
      />

      {bankAccount ? (
        <NoticeBox title="Dados para pagamento">
          Conta: {bankAccount.name}
          {bankAccount.pix_key ? " · Chave Pix: " + bankAccount.pix_key : ""}
          . Envie o comprovante identificando a fatura.
        </NoticeBox>
      ) : (
        <NoticeBox title="Pagamento">
          Solicite os dados de pagamento à equipe financeira da Nativos Experiences.
        </NoticeBox>
      )}

      <Text style={{ marginTop: 4, fontSize: 7.5, lineHeight: 1.45, color: BRAND_COLORS.muted }}>
        Esta fatura consolida os serviços vinculados ao ciclo informado e não substitui nota fiscal quando exigida.
      </Text>
    </DocumentShell>
  );
}

