import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { registerBrandFonts } from "@/lib/documents/register-fonts";
import { BRAND_COLORS, BRAND_FONTS } from "@/lib/documents/brand";
import { WordmarkPdf } from "@/lib/documents/components/wordmark-pdf";

registerBrandFonts();

export async function loadReceptionSignData(serviceId: string) {
  const service = await prisma.service.findUniqueOrThrow({ where: { id: serviceId } });

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
    backgroundColor: BRAND_COLORS.forest,
    color: BRAND_COLORS.cream,
    padding: 44,
  },
  frame: {
    position: "absolute",
    top: 22,
    right: 22,
    bottom: 22,
    left: 22,
    borderWidth: 1,
    borderColor: BRAND_COLORS.gold,
    opacity: 0.55,
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
    marginBottom: 14,
    fontSize: 9,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 2.2,
    color: BRAND_COLORS.gold,
  },
  name: {
    fontFamily: BRAND_FONTS.serif,
    fontWeight: 600,
    lineHeight: 1.05,
    color: BRAND_COLORS.cream,
    textAlign: "center",
  },
  line: {
    marginTop: 22,
    width: 64,
    height: 1,
    backgroundColor: BRAND_COLORS.gold,
  },
  footer: {
    alignItems: "center",
  },
  footerText: {
    fontSize: 8,
    letterSpacing: 1.1,
    color: BRAND_COLORS.cream,
    opacity: 0.55,
  },
});

export function ReceptionSignDocument({
  data,
}: {
  data: Awaited<ReturnType<typeof loadReceptionSignData>>;
}) {
  const normalizedLength = Math.max(1, data.passengerName.trim().length);
  const nameSize = Math.max(34, Math.min(67, 980 / normalizedLength));

  return (
    <Document title={"Recepção · " + data.passengerName} author="Nativos Experiences">
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.frame} />
        <View style={styles.header}>
          <WordmarkPdf size={31} tone="cream-on-forest" />
        </View>
        <View style={styles.center}>
          <Text style={styles.welcome}>Bem-vindo</Text>
          <Text style={[styles.name, { fontSize: nameSize }]}>{data.passengerName}</Text>
          <View style={styles.line} />
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>NATIVOS EXPERIENCES · TRANCOSO</Text>
        </View>
      </Page>
    </Document>
  );
}
