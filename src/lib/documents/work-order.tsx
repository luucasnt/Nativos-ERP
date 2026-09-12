import { Text, View } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { resolveShowPrice } from "@/lib/documents/price-visibility";
import { DocumentShell } from "@/lib/documents/components/document-shell";
import { BRAND_COLORS, BRAND_FONTS } from "@/lib/documents/brand";
import { formatCurrency, formatDate } from "@/lib/documents/format";
import { SERVICE_TYPE_LABEL } from "@/lib/reservations/service-type-labels";

export async function loadWorkOrderData(serviceId: string) {
  const service = await prisma.service.findUniqueOrThrow({
    where: { id: serviceId },
    include: { reservation: { include: { client: true } }, driver: true, vehicle: true },
  });

  const showPrice = await resolveShowPrice(service.os_show_price, "os_default");

  return { service, showPrice };
}

// OS do motorista — mesma regra de "valor opcional" do voucher, mas no
// nível do serviço (Service.os_show_price), não da reserva inteira: um
// motorista de um serviço pode ver o valor e o de outro serviço da mesma
// reserva não, se o admin configurar assim.
export function WorkOrderDocument({ data }: { data: Awaited<ReturnType<typeof loadWorkOrderData>> }) {
  const { service, showPrice } = data;
  const luggageTotal = service.luggage_10kg + service.luggage_23kg + service.luggage_32kg;
  const seatsTotal = service.bebe_conforto + service.cadeirinha + service.booster;

  return (
    <DocumentShell title="Ordem de Serviço">
      <Text style={{ fontFamily: BRAND_FONTS.serif, fontSize: 16, color: BRAND_COLORS.forest, marginBottom: 2 }}>
        {SERVICE_TYPE_LABEL[service.type] ?? service.type}
      </Text>
      <Text style={{ marginBottom: 18, color: BRAND_COLORS.forestLight }}>Reserva {service.reservation.code}</Text>

      <View style={{ marginBottom: 14 }}>
        <Text style={{ marginBottom: 3 }}>
          Data: {formatDate(service.scheduled_date)}
          {service.scheduled_time ? ` às ${service.scheduled_time}` : ""}
        </Text>
        {service.pickup_location && <Text style={{ marginBottom: 3 }}>Origem: {service.pickup_location}</Text>}
        {service.dropoff_location && <Text style={{ marginBottom: 3 }}>Destino: {service.dropoff_location}</Text>}
        {service.flight_number && <Text style={{ marginBottom: 3 }}>Voo: {service.flight_number}</Text>}
        {service.passenger_count !== null && (
          <Text style={{ marginBottom: 3 }}>Passageiros: {service.passenger_count}</Text>
        )}
        {luggageTotal > 0 && (
          <Text style={{ marginBottom: 3 }}>
            Bagagem: {service.luggage_10kg} até 10kg, {service.luggage_23kg} até 23kg, {service.luggage_32kg} até
            32kg
          </Text>
        )}
        {seatsTotal > 0 && (
          <Text style={{ marginBottom: 3 }}>
            Cadeirinha: {service.bebe_conforto} bebê conforto, {service.cadeirinha} cadeirinha, {service.booster}{" "}
            assento de elevação
          </Text>
        )}
        {service.notes && <Text style={{ marginBottom: 3 }}>Observações: {service.notes}</Text>}
      </View>

      <View
        style={{
          marginTop: 8,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: BRAND_COLORS.goldLight,
        }}
      >
        <Text style={{ fontFamily: BRAND_FONTS.serif, fontSize: 12, color: BRAND_COLORS.forest, marginBottom: 4 }}>
          Motorista e veículo
        </Text>
        <Text style={{ marginBottom: 3 }}>Motorista: {service.driver?.name ?? "A definir"}</Text>
        <Text style={{ marginBottom: 3 }}>
          Veículo: {service.vehicle ? `${service.vehicle.model} — ${service.vehicle.plate}` : "A definir"}
        </Text>
      </View>

      {showPrice && (
        <View style={{ marginTop: 14, alignItems: "flex-end" }}>
          <Text style={{ fontFamily: BRAND_FONTS.serif, fontSize: 13, color: BRAND_COLORS.forest }}>
            Valor: {formatCurrency(service.price)}
          </Text>
        </View>
      )}
    </DocumentShell>
  );
}
