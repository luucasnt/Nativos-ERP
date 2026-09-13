import { Text } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { resolveShowPrice } from "@/lib/documents/price-visibility";
import { DocumentShell } from "@/lib/documents/components/document-shell";
import { ServiceBlock } from "@/lib/documents/components/service-block";
import {
  DetailGrid,
  DocumentHero,
  NoticeBox,
  SectionHeading,
  TotalPanel,
} from "@/lib/documents/components/pdf-ui";
import { BRAND_COLORS } from "@/lib/documents/brand";
import { formatCurrency } from "@/lib/documents/format";

export async function loadVoucherData(reservationId: string) {
  const reservation = await prisma.reservation.findUniqueOrThrow({
    where: { id: reservationId },
    include: {
      client: true,
      services: {
        where: { execution_status: { not: "cancelado" } },
        orderBy: { scheduled_date: "asc" },
      },
    },
  });

  const showPrice = await resolveShowPrice(reservation.voucher_show_price, "voucher_default");
  return { reservation, showPrice };
}
export function VoucherDocument({ data }: { data: Awaited<ReturnType<typeof loadVoucherData>> }) {
  const { reservation, showPrice } = data;
  const total = reservation.services.reduce((sum, service) => sum + Number(service.price), 0);

  return (
    <DocumentShell title="Voucher de reserva" documentCode={reservation.code}>
      <DocumentHero
        kicker="Reserva confirmada"
        title={reservation.client.name}
        description={"Código " + reservation.code + " · " + reservation.services.length + " serviço(s)"}
      />

      <DetailGrid
        columns={3}
        items={[
          { label: "Passageiro", value: reservation.client.name },
          { label: "Telefone", value: reservation.client.phone ?? "Não informado" },
          { label: "E-mail", value: reservation.client.email ?? "Não informado" },
        ]}
      />

      <NoticeBox title="Antes do embarque">
        Confira data, horário e locais abaixo. Em caso de alteração, entre em contato com a equipe Nativos antes do serviço.
      </NoticeBox>

      <SectionHeading>Serviços incluídos</SectionHeading>
      {reservation.services.length === 0 ? (
        <Text style={{ color: BRAND_COLORS.muted }}>Nenhum serviço confirmado nesta reserva.</Text>
      ) : (
        reservation.services.map((service, index) => (
          <ServiceBlock
            key={service.id}
            service={service}
            showPrice={showPrice}
            sequence={index + 1}
          />
        ))
      )}

      {showPrice && (
        <TotalPanel
          label="Total da reserva"
          value={formatCurrency(total)}
          note="Valores conforme serviços listados neste voucher."
        />
      )}
    </DocumentShell>
  );
}
