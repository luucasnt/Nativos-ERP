import { Text, View } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { DocumentShell } from "@/lib/documents/components/document-shell";
import {
  DetailGrid,
  DocumentHero,
  NoticeBox,
  SectionHeading,
} from "@/lib/documents/components/pdf-ui";
import { BRAND_COLORS } from "@/lib/documents/brand";
import { formatCurrency, formatDateTime } from "@/lib/documents/format";
import { PAYMENT_METHOD_LABEL, FINANCE_ENTRY_CATEGORY_LABEL } from "@/lib/finance/labels";

async function resolvePartyName(partyType: string, partyId: string | null) {
  if (!partyId) return "—";
  if (partyType === "cliente") {
    return (await prisma.client.findUnique({ where: { id: partyId } }))?.name ?? "—";
  }
  if (partyType === "fornecedor" || partyType === "parceiro") {
    return (await prisma.company.findUnique({ where: { id: partyId } }))?.name ?? "—";
  }
  if (partyType === "motorista") {
    return (await prisma.driver.findUnique({ where: { id: partyId } }))?.name ?? "—";
  }
  return "—";
}
export async function loadReceiptData(paymentId: string) {
  const payment = await prisma.payment.findUniqueOrThrow({
    where: { id: paymentId },
    include: {
      finance_entry: { include: { reservation: true } },
      bank_account: true,
    },
  });

  const partyName = await resolvePartyName(
    payment.finance_entry.party_type,
    payment.finance_entry.party_id,
  );

  return { payment, partyName };
}

export function ReceiptDocument({ data }: { data: Awaited<ReturnType<typeof loadReceiptData>> }) {
  const { payment, partyName } = data;
  const entry = payment.finance_entry;
  const movementLabel = payment.type === "recebimento" ? "Recebimento confirmado" : "Pagamento confirmado";
  const relationship = payment.type === "recebimento" ? "Recebido de" : "Pago a";

  return (
    <DocumentShell
      title="Recibo"
      documentCode={"REC-" + payment.id.slice(0, 8).toUpperCase()}
      issuedAt={payment.created_at}
    >
      <DocumentHero
        kicker={movementLabel}
        title={formatCurrency(payment.amount)}
        description={relationship + ": " + partyName}
      />

      <SectionHeading>Dados da transação</SectionHeading>
      <DetailGrid
        columns={2}
        items={[
          { label: relationship, value: partyName },
          {
            label: "Referente a",
            value: FINANCE_ENTRY_CATEGORY_LABEL[entry.category] ?? entry.category,
          },
          {
            label: "Forma de pagamento",
            value: PAYMENT_METHOD_LABEL[payment.payment_method] ?? payment.payment_method,
          },
          { label: "Data e hora", value: formatDateTime(payment.created_at) },
          { label: "Reserva", value: entry.reservation?.code ?? "Não vinculada" },
          { label: "Conta", value: payment.bank_account?.name ?? "Não informada" },
        ]}
      />

      <NoticeBox title="Declaração">
        Para os devidos fins, a Nativos Experiences confirma a movimentação indicada neste recibo, vinculada ao lançamento financeiro descrito acima.
      </NoticeBox>

      <View
        style={{
          marginTop: 8,
          padding: 12,
          borderRadius: 4,
          backgroundColor: BRAND_COLORS.soft,
          alignItems: "center",
        }}
        wrap={false}
      >
        <Text style={{ fontSize: 7, color: BRAND_COLORS.muted }}>CÓDIGO DE AUTENTICAÇÃO</Text>
        <Text style={{ marginTop: 4, fontSize: 10, fontWeight: 600, letterSpacing: 1, color: BRAND_COLORS.forest }}>
          {payment.id.toUpperCase()}
        </Text>
      </View>

      <Text style={{ marginTop: 18, fontSize: 7.5, lineHeight: 1.45, color: BRAND_COLORS.muted }}>
        Documento gerado eletronicamente pelo Nativos ERP. Este recibo não substitui nota fiscal quando sua emissão for exigida.
      </Text>
    </DocumentShell>
  );
}
