import { Text, View } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { DocumentShell } from "@/lib/documents/components/document-shell";
import { ServiceBlock } from "@/lib/documents/components/service-block";
import { BRAND_COLORS, BRAND_FONTS } from "@/lib/documents/brand";
import { formatCurrency, formatDate } from "@/lib/documents/format";

export async function loadQuoteData(reservationId: string) {
  const reservation = await prisma.reservation.findUniqueOrThrow({
    where: { id: reservationId },
    include: {
      client: true,
      services: { where: { execution_status: { not: "cancelado" } }, orderBy: { scheduled_date: "asc" } },
    },
  });

  return { reservation };
}

// Ao contrário do voucher, um orçamento existe só para mostrar preço — o
// toggle de "valor opcional" da Fase 2 não se aplica aqui (não faria
// sentido gerar um orçamento sem valor).
export function QuoteDocument({ data }: { data: Awaited<ReturnType<typeof loadQuoteData>> }) {
  const { reservation } = data;
  const total = reservation.services.reduce((sum, s) => sum + Number(s.price), 0);

  return (
    <DocumentShell title="Orçamento">
      <Text style={{ fontFamily: BRAND_FONTS.serif, fontSize: 16, color: BRAND_COLORS.forest, marginBottom: 2 }}>
        {reservation.client.name}
      </Text>
      <Text style={{ marginBottom: 4, color: BRAND_COLORS.forestLight }}>Referência {reservation.code}</Text>
      <Text style={{ marginBottom: 18, color: BRAND_COLORS.forestLight, fontSize: 9 }}>
        Orçamento gerado em {formatDate(new Date())} — sujeito a confirmação de disponibilidade.
      </Text>

      {reservation.services.length === 0 ? (
        <Text>Nenhum serviço incluído neste orçamento.</Text>
      ) : (
        reservation.services.map((service) => <ServiceBlock key={service.id} service={service} showPrice />)
      )}

      <View style={{ marginTop: 8, alignItems: "flex-end" }}>
        <Text style={{ fontFamily: BRAND_FONTS.serif, fontSize: 14, color: BRAND_COLORS.forest }}>
          Total: {formatCurrency(total)}
        </Text>
      </View>
    </DocumentShell>
  );
}
