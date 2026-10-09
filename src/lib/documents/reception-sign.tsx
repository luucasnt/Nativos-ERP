import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { registerBrandFonts } from "@/lib/documents/register-fonts";
import { BRAND_COLORS, BRAND_FONTS } from "@/lib/documents/brand";


registerBrandFonts();

export async function loadReceptionSignData(serviceId: string) {
  const service = await prisma.service.findUniqueOrThrow({
    where: { id: serviceId },
  });

  if (!service.reception_sign_enabled) {
    throw new Error("Este serviço não tem a plaquinha de recepção habilitada.");
  }
  if (!service.reception_passenger_name) {
    throw new Error("Informe o nome do passageiro para gerar a plaquinha.");
  }

  return { passengerName: service.reception_passenger_name };
}
const styles = StyleSheet.create({
  page: {
    position: "relative",
    backgroundColor: BRAND_COLORS.white,
    color: BRAND_COLORS.forest,
    padding: 44,
  },
  frame: {
    position: "absolute",
    top: 22,
    right: 22,
    bottom: 22,
    left: 22,
    borderWidth: 0.7,
    borderColor: BRAND_COLORS.forest,
  },
  header: {
    alignItems: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  welcome: {
    marginBottom: 20,
    fontSize: 14,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 2.2,
    color: BRAND_COLORS.forest,
  },
  name: {
    fontFamily: "Poppins",
    fontWeight: 700,
    color: BRAND_COLORS.forest,
    textAlign: "center",
  },
  line: {
    marginTop: 22,
    width: 170,
    height: 1,
    backgroundColor: BRAND_COLORS.forest,
  },
  footer: {
    alignItems: "center",
  },
  footerText: {
    fontSize: 13,
    letterSpacing: 0,
    color: BRAND_COLORS.muted,
  },
});

export function ReceptionSignDocument({
  data,
}: {
  data: Awaited<ReturnType<typeof loadReceptionSignData>>;
}) {
  const normalizedLength = Math.max(1, data.passengerName.trim().length);
  const nameSize = Math.max(24, Math.min(76, 1900 / normalizedLength));

  return (
    <Document
      title={"Recepção · " + data.passengerName}
      author="Nativos Experiences"
    >
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.frame} />

        <View style={styles.header}>
          <Text style={{ fontFamily: BRAND_FONTS.serif, fontStyle: "italic", fontSize: 47, marginTop: 18 }}>nativos <Text style={{ color: BRAND_COLORS.muted }}>experiences</Text></Text>
        </View>
        <View style={styles.center}>
          <Text style={styles.welcome}>BEM-VINDO</Text>
          <View style={[styles.line, { marginTop: 0, marginBottom: 25 }]} />
          <Text style={[styles.name, { fontSize: nameSize }]}>
            {data.passengerName.trim().length > 22 ? data.passengerName.trim().replace(/\s+/, "\n") : data.passengerName}
          </Text>
          <View style={styles.line} />
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>Nativos Experiences - nascidos em Trancoso.</Text>
        </View>
      </Page>
    </Document>
  );
}
