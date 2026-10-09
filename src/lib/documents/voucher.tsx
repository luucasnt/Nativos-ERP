import { loadDocumentCompany } from "@/lib/documents/company";
import { Text } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { resolveShowPrice } from "@/lib/documents/price-visibility";
import { DocumentShell } from "@/lib/documents/components/document-shell";
import { ServiceBlock } from "@/lib/documents/components/service-block";
import {
  DetailGrid,
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
        orderBy: [{ scheduled_date: "asc" }, { scheduled_time: "asc" }, { id: "asc" }],
        include: { driver: true, vehicle: true },
      },
    },
  });

  const showPrice = await resolveShowPrice(
    reservation.voucher_show_price,
    "voucher_default",
  );
  return { reservation, showPrice, company: await loadDocumentCompany() };
}
export function VoucherDocument({
  data,
}: {
  data: Awaited<ReturnType<typeof loadVoucherData>>;
}) {
  const { reservation, showPrice } = data;
  const total = reservation.services.reduce(
    (sum, service) => sum + Number(service.price),
    0,
  );

  return (
    <DocumentShell company={data.company} title="Voucher de reserva" documentCode={reservation.code}>
      <DetailGrid
        columns={3}
        items={[
          { label: "Passageiro", value: reservation.client.name },
          {
            label: "Telefone",
            value: reservation.client.phone ?? "Não informado",
          },
          {
            label: "E-mail",
            value: reservation.client.email ?? "Não informado",
          },
        ]}
      />

      <SectionHeading>Serviços incluídos</SectionHeading>
      {reservation.services.length === 0 ? (
        <Text style={{ color: BRAND_COLORS.muted }}>
          Nenhum serviço confirmado nesta reserva.
        </Text>
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

      <NoticeBox title="Antes do serviço">
        Confira passageiros, bagagens e assentos infantis. {reservation.services.some(service => service.type !== "transfer_chegada") ? "Esteja pronto 10 minutos antes do embarque. " : ""} Siga o ponto de encontro indicado em cada serviço. Para dúvidas ou alterações, contate a Nativos.
      </NoticeBox>

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
