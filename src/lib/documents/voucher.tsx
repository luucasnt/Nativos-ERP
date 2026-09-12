import { Text, View } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { resolveShowPrice } from "@/lib/documents/price-visibility";
import { DocumentShell } from "@/lib/documents/components/document-shell";
import { ServiceBlock } from "@/lib/documents/components/service-block";
import { BRAND_COLORS, BRAND_FONTS } from "@/lib/documents/brand";
import { formatCurrency } from "@/lib/documents/format";

export async function loadVoucherData(reservationId: string) {
  const reservation = await prisma.reservation.findUniqueOrThrow({
    where: { id: reservationId },
    include: {
      client: true,
      services: { where: { execution_status: { not: "cancelado" } }, orderBy: { scheduled_date: "asc" } },
    },
  });

  const showPrice = await resolveShowPrice(reservation.voucher_show_price, "voucher_default");

  return { reservation, showPrice };
}

export function VoucherDocument({ data }: { data: Awaited<ReturnType<typeof loadVoucherData>> }) {
  const { reservation, showPrice } = data;

  return (
    <DocumentShell title="Voucher">
      <Text style={{ fontFamily: BRAND_FONTS.serif, fontSize: 16, color: BRAND_COLORS.forest, marginBottom: 2 }}>
        {reservation.client.name}
      </Text>
      <Text style={{ marginBottom: 18, color: BRAND_COLORS.forestLight }}>Reserva {reservation.code}</Text>

      {reservation.services.length === 0 ? (
        <Text>Nenhum serviço confirmado nesta reserva.</Text>
      ) : (
        reservation.services.map((service) => (
          <ServiceBlock key={service.id} service={service} showPrice={showPrice} />
        ))
      )}

      {showPrice && (
        <View style={{ marginTop: 8, alignItems: "flex-end" }}>
          <Text style={{ fontFamily: BRAND_FONTS.serif, fontSize: 14, color: BRAND_COLORS.forest }}>
            Total: {formatCurrency(reservation.services.reduce((sum, s) => sum + Number(s.price), 0))}
          </Text>
        </View>
      )}
    </DocumentShell>
  );
}
