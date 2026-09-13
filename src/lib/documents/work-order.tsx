import { Text, View } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { resolveShowPrice } from "@/lib/documents/price-visibility";
import { DocumentShell } from "@/lib/documents/components/document-shell";
import { ServiceBlock } from "@/lib/documents/components/service-block";
import {
  DetailGrid,
  DocumentHero,
  NoticeBox,
  OperationalChecklist,
  SectionHeading,
  SignatureRow,
} from "@/lib/documents/components/pdf-ui";
import { BRAND_COLORS } from "@/lib/documents/brand";
import { formatDateTime } from "@/lib/documents/format";
import { SERVICE_TYPE_LABEL } from "@/lib/reservations/service-type-labels";

export async function loadWorkOrderData(serviceId: string) {
  const service = await prisma.service.findUniqueOrThrow({
    where: { id: serviceId },
    include: {
      reservation: { include: { client: true } },
      driver: true,
      vehicle: true,
    },
  });

  const showPrice = await resolveShowPrice(service.os_show_price, "os_default");
  return { service, showPrice };
}

export function WorkOrderDocument({
  data,
}: {
  data: Awaited<ReturnType<typeof loadWorkOrderData>>;
}) {
  const { service, showPrice } = data;
  const passengerName =
    service.reception_passenger_name ?? service.reservation.client.name;

  return (
    <DocumentShell
      title="Ordem de serviço"
      documentCode={
        service.reservation.code +
        " · OS " +
        service.id.slice(0, 8).toUpperCase()
      }
    >
      <DocumentHero
        kicker="Operação"
        title={SERVICE_TYPE_LABEL[service.type] ?? service.type}
        description={"Passageiro: " + passengerName}
      />

      <DetailGrid
        columns={3}
        items={[
          { label: "Reserva", value: service.reservation.code },
          { label: "Passageiro", value: passengerName },
          {
            label: "Telefone",
            value: service.reservation.client.phone ?? "Não informado",
          },
          { label: "Motorista", value: service.driver?.name ?? "A definir" },
          {
            label: "Veículo",
            value: service.vehicle
              ? service.vehicle.model + " · " + service.vehicle.plate
              : "A definir",
          },
        ]}
      />

      <SectionHeading>Detalhes do serviço</SectionHeading>
      <ServiceBlock service={service} showPrice={showPrice} sequence={1} />

      {service.notes && (
        <NoticeBox title="Orientações da operação">{service.notes}</NoticeBox>
      )}

      <NoticeBox title="Orientação de cobrança">
        {service.driver_can_receive_payment
          ? "Recebimento pelo motorista autorizado. Confirme o valor e registre o recebimento no sistema imediatamente após o serviço."
          : "Não realizar cobrança ao passageiro. Em caso de dúvida sobre pagamento, acione a equipe Nativos antes de encerrar o atendimento."}
      </NoticeBox>

      <View break>
        <SectionHeading>Checklist do motorista</SectionHeading>
        <OperationalChecklist
          items={[
            "Conferir passageiro, telefone, quantidade de pessoas, bagagens e assentos infantis.",
            "Confirmar origem, destino, horário e rota antes de iniciar o deslocamento.",
            "Verificar limpeza, climatização, combustível e condições de segurança do veículo.",
            ...(service.flight_number
              ? [
                  "Acompanhar o voo " +
                    service.flight_number +
                    " e posicionar-se no desembarque com antecedência.",
                ]
              : []),
            "Registrar início e conclusão no portal; comunicar imediatamente qualquer ocorrência.",
          ]}
        />

        <SectionHeading>Controle de execução</SectionHeading>
        <View
          style={{
            flexDirection: "row",
            gap: 7,
            marginBottom: 16,
          }}
          wrap={false}
        >
          {[
            {
              label: "Saída / início",
              value: service.started_at
                ? formatDateTime(service.started_at)
                : "____ / ____ / ______  ____:____",
            },
            {
              label: "Chegada / conclusão",
              value: service.completed_at
                ? formatDateTime(service.completed_at)
                : "____ / ____ / ______  ____:____",
            },
          ].map((item) => (
            <View
              key={item.label}
              style={{
                flex: 1,
                minHeight: 48,
                padding: 9,
                borderWidth: 1,
                borderColor: BRAND_COLORS.line,
                borderRadius: 4,
              }}
            >
              <Text
                style={{
                  marginBottom: 5,
                  fontSize: 7,
                  fontWeight: 600,
                  color: BRAND_COLORS.muted,
                }}
              >
                {item.label.toUpperCase()}
              </Text>
              <Text style={{ fontSize: 8.5, color: BRAND_COLORS.ink }}>
                {item.value}
              </Text>
            </View>
          ))}
        </View>

        <SectionHeading>Registro de ocorrências</SectionHeading>
        <View
          style={{
            height: 92,
            marginBottom: 18,
            padding: 9,
            borderWidth: 1,
            borderColor: BRAND_COLORS.line,
            borderRadius: 4,
          }}
          wrap={false}
        >
          <Text style={{ fontSize: 7.5, color: BRAND_COLORS.muted }}>
            Registre atrasos, alterações de rota, objetos esquecidos ou qualquer
            fato relevante.
          </Text>
        </View>

        <SignatureRow
          labels={["Motorista responsável", "Responsável pelo atendimento"]}
        />
      </View>
    </DocumentShell>
  );
}
