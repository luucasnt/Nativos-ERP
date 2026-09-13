import { StyleSheet, Text, View } from "@react-pdf/renderer";
import { BRAND_COLORS } from "@/lib/documents/brand";
import { DetailGrid } from "@/lib/documents/components/pdf-ui";
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

const styles = StyleSheet.create({
  block: {
    marginBottom: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: BRAND_COLORS.line,
    borderRadius: 5,
    backgroundColor: BRAND_COLORS.white,
  },
  header: {
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  sequence: {
    marginBottom: 3,
    fontSize: 6.8,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: BRAND_COLORS.gold,
  },
  title: {
    fontSize: 11,
    fontWeight: 600,
    color: BRAND_COLORS.forest,
  },
  price: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 3,
    backgroundColor: BRAND_COLORS.soft,
    fontSize: 9,
    fontWeight: 600,
    color: BRAND_COLORS.forest,
  },
  route: {
    marginBottom: 10,
    flexDirection: "row",
    gap: 7,
  },
  routeItem: {
    flex: 1,
    minHeight: 43,
    padding: 9,
    borderRadius: 4,
    backgroundColor: BRAND_COLORS.soft,
    borderWidth: 1,
    borderColor: BRAND_COLORS.line,
  },
  routeLabel: {
    marginBottom: 3,
    fontSize: 6.8,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    color: BRAND_COLORS.muted,
  },
  routeText: {
    fontSize: 8.5,
    color: BRAND_COLORS.ink,
  },
  extra: {
    marginTop: -7,
    marginBottom: 8,
    fontSize: 7.5,
    lineHeight: 1.45,
    color: BRAND_COLORS.muted,
  },
});

export function ServiceBlock({
  service,
  showPrice,
  sequence,
}: {
  service: ServiceForBlock;
  showPrice: boolean;
  sequence?: number;
}) {
  const luggageTotal =
    service.luggage_10kg + service.luggage_23kg + service.luggage_32kg;
  const seatsTotal =
    service.bebe_conforto + service.cadeirinha + service.booster;

  const detailItems = [
    {
      label: "Data e horário",
      value:
        formatDate(service.scheduled_date) +
        (service.scheduled_time ? " · " + service.scheduled_time : ""),
    },
    {
      label: "Passageiros",
      value:
        service.passenger_count === null
          ? "Não informado"
          : String(service.passenger_count),
    },
    ...(service.flight_number
      ? [{ label: "Voo", value: service.flight_number }]
      : []),
  ];

  return (
    <View style={styles.block} wrap={false}>
      <View style={styles.header}>
        <View>
          <Text style={styles.sequence}>
            Serviço {sequence ? String(sequence).padStart(2, "0") : ""}
          </Text>
          <Text style={styles.title}>
            {SERVICE_TYPE_LABEL[service.type] ?? service.type}
          </Text>
        </View>
        {showPrice && (
          <Text style={styles.price}>{formatCurrency(service.price)}</Text>
        )}
      </View>

      {(service.pickup_location || service.dropoff_location) && (
        <View style={styles.route}>
          <View style={styles.routeItem}>
            <Text style={styles.routeLabel}>Origem</Text>
            <Text style={styles.routeText}>
              {service.pickup_location ?? "A definir"}
            </Text>
          </View>
          <View style={styles.routeItem}>
            <Text style={styles.routeLabel}>Destino</Text>
            <Text style={styles.routeText}>
              {service.dropoff_location ?? "A definir"}
            </Text>
          </View>
        </View>
      )}

      <DetailGrid
        items={detailItems}
        columns={detailItems.length >= 3 ? 3 : 2}
      />

      {luggageTotal > 0 && (
        <Text style={styles.extra}>
          Bagagem · {service.luggage_10kg} até 10 kg · {service.luggage_23kg}{" "}
          até 23 kg · {service.luggage_32kg} até 32 kg
        </Text>
      )}
      {seatsTotal > 0 && (
        <Text style={styles.extra}>
          Assentos infantis · {service.bebe_conforto} bebê conforto ·{" "}
          {service.cadeirinha} cadeirinha · {service.booster} elevação
        </Text>
      )}
    </View>
  );
}
