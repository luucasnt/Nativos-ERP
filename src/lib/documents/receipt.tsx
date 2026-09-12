import { Text, View } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { DocumentShell } from "@/lib/documents/components/document-shell";
import { BRAND_COLORS, BRAND_FONTS } from "@/lib/documents/brand";
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
    include: { finance_entry: { include: { reservation: true } }, bank_account: true },
  });

  const partyName = await resolvePartyName(payment.finance_entry.party_type, payment.finance_entry.party_id);

  return { payment, partyName };
}

export function ReceiptDocument({ data }: { data: Awaited<ReturnType<typeof loadReceiptData>> }) {
  const { payment, partyName } = data;
  const entry = payment.finance_entry;

  return (
    <DocumentShell title="Recibo">
      <Text style={{ fontFamily: BRAND_FONTS.serif, fontSize: 16, color: BRAND_COLORS.forest, marginBottom: 18 }}>
        {formatCurrency(payment.amount)}
      </Text>

      <View style={{ marginBottom: 4 }}>
        <Text style={{ marginBottom: 3 }}>
          {payment.type === "recebimento" ? "Recebido de" : "Pago a"}: {partyName}
        </Text>
        <Text style={{ marginBottom: 3 }}>Referente a: {FINANCE_ENTRY_CATEGORY_LABEL[entry.category] ?? entry.category}</Text>
        {entry.reservation && <Text style={{ marginBottom: 3 }}>Reserva: {entry.reservation.code}</Text>}
        <Text style={{ marginBottom: 3 }}>Forma de pagamento: {PAYMENT_METHOD_LABEL[payment.payment_method]}</Text>
        <Text style={{ marginBottom: 3 }}>Data: {formatDateTime(payment.created_at)}</Text>
        {payment.bank_account && <Text style={{ marginBottom: 3 }}>Conta: {payment.bank_account.name}</Text>}
      </View>

      <Text style={{ marginTop: 24, fontSize: 8, color: BRAND_COLORS.forestLight }}>
        Documento gerado eletronicamente pelo Nativos ERP — não substitui nota fiscal, quando aplicável.
      </Text>
    </DocumentShell>
  );
}
