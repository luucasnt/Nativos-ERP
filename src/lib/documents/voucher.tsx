import { voucherFinancialSummary, voucherPaymentInstructions } from "@/lib/documents/voucher-finance";
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
  const paymentInstructions = voucherPaymentInstructions(reservation);
  const arrival = reservation.services.some(service => service.type === "transfer_chegada");
  const departure = reservation.services.some(service => service.type === "transfer_saida");
  const instructions = [
    ...(arrival ? [reservation.services.some(service => service.type === "transfer_chegada" && service.flight_number)
      ? "Nossa equipe acompanha o voo de chegada em tempo real. Informe imediatamente mudanças de voo, conexões perdidas ou alterações no itinerário."
      : "Informe o número do voo à equipe para o acompanhamento em tempo real e a organização da recepção no desembarque."] : []),
    ...(departure ? ["Na saída ao aeroporto, confirme a antecedência para seu voo. Avise a equipe se mudar a hospedagem ou o local de embarque."] : []),
    ...(!arrival && !departure ? ["Esteja no local de encontro combinado 10 minutos antes do horário do serviço."] : []),
    "Em caso de imprevisto, atraso ou dificuldade no encontro, avise a equipe imediatamente. Mantenha o telefone e o WhatsApp disponíveis.",
    "Confira datas, horários, locais, passageiros, bagagens e assentos infantis. Alterações devem ser confirmadas pela equipe com antecedência.",
    "Informe à equipe, com antecedência, necessidades de acessibilidade ou assistência para organizarmos seu atendimento.",
    "Confira seus pertences ao desembarcar. Em caso de objeto esquecido, informe à equipe o código da reserva e o serviço realizado.",
  ];

  return (
    <DocumentShell passengerName={reservation.client.name} company={data.company} title="Voucher de reserva" documentCode={reservation.code}>
      <Text style={{ fontSize: 9, marginBottom: 8 }}>Este é seu voucher de confirmação da reserva {reservation.code}. Obrigado por escolher a Nativos Experiences. Reunimos abaixo os detalhes dos serviços contratados e as orientações para sua viagem. Nossa equipe está à disposição para ajudar antes, durante e após o atendimento.</Text>
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
        <View wrap={false} style={{ borderWidth: 1, borderColor: BRAND_COLORS.goldLight, borderRadius: 5, marginTop: 4, padding: 7 }}>
          <Text style={{ fontSize: 9, fontWeight: 600, color: BRAND_COLORS.forest, marginBottom: 5 }}>{paymentInstructions.heading}</Text>
          <DetailGrid compact columns={3} items={[
            { label: "Total contratado", value: formatCurrency(finance.total) },
            { label: "Pagamento registrado", value: finance.partnerBilling ? "Responsabilidade do parceiro" : formatCurrency(finance.paid) },
            { label: "Saldo restante", value: finance.partnerBilling ? "Cobrança ao parceiro" : formatCurrency(finance.remaining) },
          ]} />
          <Text style={{ fontSize: 7.4, color: BRAND_COLORS.ink }}>{paymentInstructions.message}</Text>
          {(paymentInstructions.collections.some(item => item.receiver === "motorista") ? paymentInstructions.collections : []).map(item => <Text key={item.sequence} style={{ fontSize: 7.4, marginTop: 3 }}>Serviço {String(item.sequence).padStart(2, "0")}: {formatCurrency(item.amount)} a pagar {item.receiver === "motorista" ? "diretamente ao motorista" + (item.driverName ? " " + item.driverName : " responsável") : "à Nativos"}.</Text>)}
          {finance.credit.gt(0) && !finance.partnerBilling && <Text style={{ fontSize: 7.4, marginTop: 3 }}>Crédito registrado: {formatCurrency(finance.credit)}. Consulte nossa equipe para o ajuste.</Text>}
        </View>
      )}
    </DocumentShell>
  );
}
