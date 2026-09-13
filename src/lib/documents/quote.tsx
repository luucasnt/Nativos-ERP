import { Text } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
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
import { formatCurrency, formatDate } from "@/lib/documents/format";

export async function loadQuoteData(reservationId: string) {
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

  return { reservation };
}
export function QuoteDocument({ data }: { data: Awaited<ReturnType<typeof loadQuoteData>> }) {
  const { reservation } = data;
  const total = reservation.services.reduce((sum, service) => sum + Number(service.price), 0);

  return (
    <DocumentShell title="Proposta comercial" documentCode={reservation.code}>
      <DocumentHero
        kicker="Orçamento"
        title={reservation.client.name}
        description="Experiências e deslocamentos planejados pela Nativos."
      />

      <DetailGrid
        columns={3}
        items={[
          { label: "Referência", value: reservation.code },
          { label: "Emissão", value: formatDate(new Date()) },
          { label: "Serviços", value: String(reservation.services.length) },
        ]}
      />

      <SectionHeading>Composição da proposta</SectionHeading>
      {reservation.services.length === 0 ? (
        <Text style={{ color: BRAND_COLORS.muted }}>Nenhum serviço incluído neste orçamento.</Text>
      ) : (
        reservation.services.map((service, index) => (
          <ServiceBlock key={service.id} service={service} showPrice sequence={index + 1} />
        ))
      )}

      <TotalPanel
        label="Investimento total"
        value={formatCurrency(total)}
        note="Impostos e condições aplicáveis conforme a reserva."
      />

      <NoticeBox title="Condições da proposta">
        Valores e disponibilidade estão sujeitos à confirmação no momento da aprovação. Alterações de rota, horário, passageiros ou recursos podem exigir uma nova cotação.
      </NoticeBox>
    </DocumentShell>
  );
}
