import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { registerBrandFonts } from "@/lib/documents/register-fonts";
import { BRAND_COLORS, BRAND_FONTS } from "@/lib/documents/brand";
import { WordmarkPdf } from "@/lib/documents/components/wordmark-pdf";

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
    borderWidth: 2,
    borderColor: BRAND_COLORS.forest,
  },
  innerFrame: {
    position: "absolute",
    top: 29,
    right: 29,
    bottom: 29,
    left: 29,
    borderWidth: 0.7,
    borderColor: BRAND_COLORS.gold,
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
    color: BRAND_COLORS.forest,
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
    color: BRAND_COLORS.muted,
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
    <Document
      title={"Recepção · " + data.passengerName}
      author="Nativos Experiences"
    >
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.frame} />
        <View style={styles.innerFrame} />
        <View style={styles.header}>
          <WordmarkPdf size={31} tone="forest-on-cream" />
        </View>
        <View style={styles.center}>
          <Text style={styles.welcome}>Bem-vindo</Text>
          <Text style={[styles.name, { fontSize: nameSize }]}>
            {data.passengerName}
          </Text>
          <View style={styles.line} />
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>NATIVOS EXPERIENCES · TRANCOSO</Text>
        </View>
      </Page>
    </Document>
  );
}
