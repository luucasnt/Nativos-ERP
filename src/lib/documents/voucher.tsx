import { Text } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { resolveShowPrice } from "@/lib/documents/price-visibility";
import { DocumentShell } from "@/lib/documents/components/document-shell";
import { ServiceBlock } from "@/lib/documents/components/service-block";
import {
  DetailGrid,
  DocumentHero,
  InstructionList,
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

  const showPrice = await resolveShowPrice(
    reservation.voucher_show_price,
    "voucher_default",
  );
  return { reservation, showPrice };
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
  const includesAirportArrival = reservation.services.some(
    (service) =>
      service.type === "transfer_chegada" || Boolean(service.flight_number),
  );
  const passengerInstructions = [
    "Esteja pronto no local de embarque com 10 minutos de antecedência e mantenha o telefone informado na reserva disponível.",
    ...(includesAirportArrival
      ? [
          "Na chegada ao aeroporto, retire suas bagagens e siga para o desembarque. O motorista aguardará identificado; avise a equipe se houver atraso na retirada.",
        ]
      : []),
    "Em recepções de aeroporto, há 20 minutos de tolerância gratuita. Após 40 minutos sem contato, o atendimento poderá ser registrado como não comparecimento.",
    "Solicite alterações de dados ou rota com pelo menos 3 horas de antecedência. Cancelamentos ou remarcações devem ser solicitados com 24 horas de antecedência.",
    "Confira passageiros, bagagens e assentos infantis descritos em cada serviço. Qualquer diferença deve ser informada antes do embarque.",
    "A categoria do veículo é garantida; o modelo pode variar conforme disponibilidade. Suporte Nativos: WhatsApp +55 73 99168-1630.",
  ];

  return (
    <DocumentShell title="Voucher de reserva" documentCode={reservation.code}>
      <DocumentHero
        kicker="Reserva confirmada"
        title={reservation.client.name}
        description={
          "Código " +
          reservation.code +
          " · Confira os serviços e as orientações antes do embarque."
        }
      />

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

      <InstructionList
        title="Orientações ao passageiro"
        subtitle="Informações importantes para um atendimento tranquilo e pontual."
        items={passengerInstructions}
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
