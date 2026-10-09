import { categoryDescription } from "@/lib/reservations/categories";
import { serviceDocumentContext } from "@/lib/documents/service-context";
import { StyleSheet, Text, View } from "@react-pdf/renderer";
import { BRAND_COLORS } from "@/lib/documents/brand";
import { DetailGrid } from "@/lib/documents/components/pdf-ui";
import { formatCurrency, formatDate } from "@/lib/documents/format";
import { SERVICE_TYPE_LABEL } from "@/lib/reservations/service-type-labels";

type ServiceForBlock = {
  contracted_category_label?: string | null;
  upgrade_category_label?: string | null;
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
  compact = false,
  sequence,
}: {
  service: ServiceForBlock;
  showPrice: boolean;
  compact?: boolean;
  sequence?: number;
}) {
  const category = categoryDescription(service);
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
    <View style={[styles.block, compact ? { padding: 6 } : {}]} wrap={false}>
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

      <Text style={{ fontSize: 8, marginBottom: 3 }}>Categoria contratada: {category.contracted}</Text>
      {category.upgrade && <Text style={{ fontSize: 8, fontWeight: 600, color: BRAND_COLORS.forest, backgroundColor: BRAND_COLORS.soft, padding: 4, marginBottom: 4 }}>{category.upgrade}</Text>}

      {(service.pickup_location || service.dropoff_location) && (
        <View style={styles.route}>
          <View style={[styles.routeItem, compact ? { padding: 3, minHeight: 0 } : {}]}>
            <Text style={[styles.routeLabel, compact ? { marginBottom: 1 } : {}]}>{context.pickupLabel}</Text>
            <Text style={styles.routeText}>
              {service.pickup_location ?? "A definir"}
            </Text>
          </View>
          <View style={[styles.routeItem, compact ? { padding: 3, minHeight: 0 } : {}]}>
            <Text style={[styles.routeLabel, compact ? { marginBottom: 1 } : {}]}>{context.dropoffLabel}</Text>
            <Text style={styles.routeText}>
              {service.dropoff_location ?? "A definir"}
            </Text>
          </View>
        </View>
      )}

      {compact ? <Text style={{ fontSize: 8, marginBottom: 4 }}>{detailItems.map(item => `${item.label}: ${item.value}`).join("  |  ")}</Text> : <DetailGrid
        items={detailItems}
        compact={compact}
        columns={detailItems.length >= 3 ? 3 : 2}
      />}

      {("driver" in service || "vehicle" in service) && (
        compact ? <Text style={{ fontSize: 8, marginBottom: 4 }}>Motorista: {service.driver?.name || "A definir pela operação"} | Veículo: {service.vehicle?.model || "A definir pela operação"} | Placa: {service.vehicle?.plate || "A definir pela operação"}</Text> : <DetailGrid columns={3} items={[
          { label: "Motorista", value: service.driver?.name || "A definir pela operação" },
          { label: "Veículo", value: service.vehicle?.model || "A definir pela operação" },
          { label: "Placa", value: service.vehicle?.plate || "A definir pela operação" },
        ]} />
      )}
      <Text style={[styles.extra, compact ? { marginBottom: 4 } : {}]}>{compact ? service.type === "transfer_chegada" ? "Encontro: área de desembarque, após retirar as bagagens. Plaquinha de recepção quando contratada." : service.type === "transfer_saida" ? "Encontro: local de embarque acima. Horário do transfer, não do voo." : "Encontro: local de embarque acima, conforme combinado com a equipe." : context.meeting}</Text>
      {(luggageTotal > 0 || seatsTotal > 0) && (
        <Text style={[styles.extra, compact ? { marginBottom: 0 } : {}]}>
          {[
            service.luggage_10kg ? `${service.luggage_10kg} ${service.luggage_10kg === 1 ? "bagagem" : "bagagens"} até 10 kg` : "",
            service.luggage_23kg ? `${service.luggage_23kg} ${service.luggage_23kg === 1 ? "bagagem" : "bagagens"} até 23 kg` : "",
            service.luggage_32kg ? `${service.luggage_32kg} ${service.luggage_32kg === 1 ? "bagagem" : "bagagens"} até 32 kg` : "",
            service.bebe_conforto ? `${service.bebe_conforto} ${service.bebe_conforto === 1 ? "bebê-conforto" : "bebês-conforto"}` : "",
            service.cadeirinha ? `${service.cadeirinha} ${service.cadeirinha === 1 ? "cadeirinha" : "cadeirinhas"}` : "",
            service.booster ? `${service.booster} ${service.booster === 1 ? "assento" : "assentos"} de elevação` : "",
          ].filter(Boolean).join(" | ")}
        </Text>
      )}
    </View>
  );
}
