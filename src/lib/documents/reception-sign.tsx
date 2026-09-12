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
    backgroundColor: BRAND_COLORS.forest,
    alignItems: "center",
    justifyContent: "center",
    padding: 48,
  },
  name: {
    fontFamily: BRAND_FONTS.serif,
    fontSize: 64,
    color: BRAND_COLORS.cream,
    textAlign: "center",
  },
});

// Plaquinha de recepção (requisito adicional pós-Fase 1): página única,
// paisagem, para o motorista segurar na chegada do passageiro — texto
// grande, sem tabela/lista, propositalmente diferente do DocumentShell
// usado nos outros 5 documentos (não é um "documento de escritório").
export function ReceptionSignDocument({ data }: { data: Awaited<ReturnType<typeof loadReceptionSignData>> }) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={{ marginBottom: 40 }}>
          <WordmarkPdf size={28} tone="cream-on-forest" />
        </View>
        <Text style={styles.name}>{data.passengerName}</Text>
      </Page>
    </Document>
  );
}
