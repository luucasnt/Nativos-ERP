import { Text, View } from "@react-pdf/renderer";
import { BRAND_COLORS, BRAND_FONTS } from "@/lib/documents/brand";
import { formatCurrency, formatDate } from "@/lib/documents/format";
import { SERVICE_TYPE_LABEL } from "@/lib/reservations/service-type-labels";

type ServiceForBlock = {
  id: string;
  type: string;
  scheduled_date: Date | null;
  scheduled_time: string | null;
  pickup_location: string | null;
  dropoff_location: string | null;
  passenger_count: number | null;
  flight_number: string | null;
  luggage_10kg: number;
  luggage_23kg: number;
  luggage_32kg: number;
  bebe_conforto: number;
  cadeirinha: number;
  booster: number;
  price: { toString(): string };
};

// Bloco de um serviço reaproveitado pelo voucher e pelo orçamento — os
// dois listam os mesmos dados de agenda/local/passageiro, só mudam o
// título do documento e a regra de exibir o valor.
export function ServiceBlock({ service, showPrice }: { service: ServiceForBlock; showPrice: boolean }) {
  const luggageTotal = service.luggage_10kg + service.luggage_23kg + service.luggage_32kg;
  const seatsTotal = service.bebe_conforto + service.cadeirinha + service.booster;

  return (
    <View
      style={{
        marginBottom: 14,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: BRAND_COLORS.goldLight,
      }}
      wrap={false}
    >
      <Text style={{ fontFamily: BRAND_FONTS.serif, fontSize: 13, color: BRAND_COLORS.forest, marginBottom: 4 }}>
        {SERVICE_TYPE_LABEL[service.type] ?? service.type}
      </Text>
      <Text style={{ marginBottom: 2 }}>
        Data: {formatDate(service.scheduled_date)}
        {service.scheduled_time ? ` às ${service.scheduled_time}` : ""}
      </Text>
      {service.pickup_location && <Text style={{ marginBottom: 2 }}>Origem: {service.pickup_location}</Text>}
      {service.dropoff_location && <Text style={{ marginBottom: 2 }}>Destino: {service.dropoff_location}</Text>}
      {service.flight_number && <Text style={{ marginBottom: 2 }}>Voo: {service.flight_number}</Text>}
      {service.passenger_count !== null && (
        <Text style={{ marginBottom: 2 }}>Passageiros: {service.passenger_count}</Text>
      )}
      {luggageTotal > 0 && (
        <Text style={{ marginBottom: 2 }}>
          Bagagem: {service.luggage_10kg} até 10kg, {service.luggage_23kg} até 23kg, {service.luggage_32kg} até 32kg
        </Text>
      )}
      {seatsTotal > 0 && (
        <Text style={{ marginBottom: 2 }}>
          Cadeirinha: {service.bebe_conforto} bebê conforto, {service.cadeirinha} cadeirinha, {service.booster} assento
          de elevação
        </Text>
      )}
      {showPrice && (
        <Text style={{ marginTop: 4, fontFamily: BRAND_FONTS.serif, fontSize: 12, color: BRAND_COLORS.forest }}>
          {formatCurrency(service.price)}
        </Text>
      )}
    </View>
  );
}
