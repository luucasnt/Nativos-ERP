import { voucherFinancialSummary } from "@/lib/documents/voucher-finance";
import { loadDocumentCompany } from "@/lib/documents/company";
import { Text, View } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { resolveShowPrice } from "@/lib/documents/price-visibility";
import { DocumentShell } from "@/lib/documents/components/document-shell";
import { ServiceBlock } from "@/lib/documents/components/service-block";
import {
  DetailGrid,
  InstructionList,
  SectionHeading,
} from "@/lib/documents/components/pdf-ui";
import { BRAND_COLORS } from "@/lib/documents/brand";
import { formatCurrency } from "@/lib/documents/format";

export async function loadVoucherData(reservationId: string) {
  const reservation = await prisma.reservation.findUniqueOrThrow({
    where: { id: reservationId },
    include: {
      client: true,
      finance_entries: { where: { type: "receita", category: "venda_servico", party_type: "cliente", reversed_at: null, estorno_of_id: null, status: { not: "cancelado" } }, select: { party_id: true, service_id: true, payments: { where: { reversed_at: null, estorno_of_id: null, type: "recebimento" }, select: { amount: true, type: true } } } },
      services: {
        where: { execution_status: { not: "cancelado" }, acceptance_status: { not: "recusado" } },
        orderBy: [{ scheduled_date: "asc" }, { scheduled_time: "asc" }, { id: "asc" }],
        include: { driver: true, vehicle: true, direct_collections: { where: { reversed_at: null, status: "received" }, select: { amount: true } } },
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
  const finance = voucherFinancialSummary(reservation);
  const arrival = reservation.services.some(service => service.type === "transfer_chegada");
  const departure = reservation.services.some(service => service.type === "transfer_saida");
  const instructions = [
    ...(arrival ? [reservation.services.some(service => service.type === "transfer_chegada" && service.flight_number)
      ? "Nossa equipe acompanha o voo de chegada em tempo real para organizar sua recepção. Avise imediatamente se houver mudança de voo, conexão perdida ou alteração do itinerário."
      : "Informe o número do voo à equipe para o acompanhamento em tempo real e a organização da recepção no desembarque."] : []),
    ...(departure ? ["Na saída para o aeroporto, esteja pronto com as bagagens 10 minutos antes do horário do transfer. O horário indicado é o embarque na hospedagem, não a decolagem do voo."] : []),
    ...(!arrival && !departure ? ["Esteja no local de encontro combinado 10 minutos antes do horário do serviço."] : []),
    "Em qualquer imprevisto, atraso ou dificuldade para encontrar o motorista, avise nossa equipe imediatamente pelos contatos abaixo. Mantenha o telefone e o WhatsApp disponíveis.",
    "Confira datas, horários, origem, destino, passageiros, bagagens e assentos infantis. Solicite alterações com antecedência para confirmarmos a disponibilidade.",
  ];

  return (
    <DocumentShell company={data.company} title="Voucher de reserva" documentCode={reservation.code}>
      <Text style={{ fontSize: 9, marginBottom: 8 }}>Este é seu voucher de confirmação da reserva {reservation.code}. Obrigado por escolher a Nativos Experiences. Confira os serviços e as orientações para uma experiência tranquila.</Text>
      <DetailGrid
        compact
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
            service={{ ...service, contracted_category_label: service.contracted_category_label || reservation.contracted_category_label }}
            compact
            showPrice={showPrice && !reservation.is_cortesia}
            sequence={index + 1}
          />
        ))
      )}

      <InstructionList title="Orientações para sua viagem" items={instructions} />
      {showPrice && (
        <View wrap={false} style={{ padding: 8, borderWidth: 1, borderColor: BRAND_COLORS.line, marginTop: 4 }}>
          <DetailGrid compact columns={3} items={[
            { label: "Valor da reserva", value: formatCurrency(finance.total) },
            { label: "Valor pago registrado", value: finance.partnerBilling ? "Tratado com o parceiro" : formatCurrency(finance.paid) },
            { label: "Saldo a pagar", value: finance.partnerBilling ? "Cobrança ao parceiro" : formatCurrency(finance.remaining) },
          ]} />
          <Text style={{ fontSize: 7, color: BRAND_COLORS.muted }}>
            {reservation.is_cortesia ? "Reserva oferecida como cortesia." : finance.partnerBilling ? "Condições de pagamento tratadas com o parceiro responsável. Este voucher não representa cobrança ao passageiro." : "Pagamentos conforme registros válidos no sistema na emissão deste voucher. Envie o comprovante à equipe para conferência."}
            {finance.credit.gt(0) && !finance.partnerBilling ? " Crédito registrado: " + formatCurrency(finance.credit) + "." : ""}
          </Text>
        </View>
      )}
    </DocumentShell>
  );
}
