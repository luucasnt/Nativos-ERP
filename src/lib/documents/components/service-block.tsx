import { serviceDocumentContext } from "@/lib/documents/service-context";
import { StyleSheet, Text, View } from "@react-pdf/renderer";
import { BRAND_COLORS } from "@/lib/documents/brand";
import { DetailGrid } from "@/lib/documents/components/pdf-ui";
import { formatCurrency, formatDate } from "@/lib/documents/format";
import { SERVICE_TYPE_LABEL } from "@/lib/reservations/service-type-labels";

type ServiceForBlock = {
  driver?: { name: string } | null;
  vehicle?: { model: string; plate: string } | null;
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
    marginBottom: 4,
    padding: 8,
    borderWidth: 1,
    borderColor: BRAND_COLORS.line,
    borderRadius: 5,
    backgroundColor: BRAND_COLORS.white,
  },
  header: {
    marginBottom: 4,
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
    marginBottom: 4,
    flexDirection: "row",
    gap: 7,
  },
  routeItem: {
    flex: 1,
    minHeight: 26,
    padding: 5,
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
    marginTop: 0,
    marginBottom: 8,
    fontSize: 8,
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
  const context = serviceDocumentContext(service.type);
  const luggageTotal =
    service.luggage_10kg + service.luggage_23kg + service.luggage_32kg;
  const seatsTotal =
    service.bebe_conforto + service.cadeirinha + service.booster;

  const detailItems = [
    {
      label: context.timeLabel,
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
      ? [{ label: context.flightLabel, value: service.flight_number }]
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
            <Text style={styles.routeLabel}>{context.pickupLabel}</Text>
            <Text style={styles.routeText}>
              {service.pickup_location ?? "A definir"}
            </Text>
          </View>
          <View style={styles.routeItem}>
            <Text style={styles.routeLabel}>{context.dropoffLabel}</Text>
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

      {("driver" in service || "vehicle" in service) && (
        <DetailGrid columns={3} items={[
          { label: "Motorista", value: service.driver?.name || "A definir pela operação" },
          { label: "Veículo", value: service.vehicle?.model || "A definir pela operação" },
          { label: "Placa", value: service.vehicle?.plate || "A definir pela operação" },
        ]} />
      )}
      <Text style={styles.extra}>{context.meeting}</Text>
      {(luggageTotal > 0 || seatsTotal > 0) && (
        <Text style={styles.extra}>
          {[
            service.luggage_10kg ? `${service.luggage_10kg} bagagem(ns) até 10 kg` : "",
            service.luggage_23kg ? `${service.luggage_23kg} bagagem(ns) até 23 kg` : "",
            service.luggage_32kg ? `${service.luggage_32kg} bagagem(ns) até 32 kg` : "",
            service.bebe_conforto ? `${service.bebe_conforto} bebê conforto` : "",
            service.cadeirinha ? `${service.cadeirinha} cadeirinha` : "",
            service.booster ? `${service.booster} assento de elevação` : "",
          ].filter(Boolean).join(" | ")}
        </Text>
      )}
    </View>
  );
}
