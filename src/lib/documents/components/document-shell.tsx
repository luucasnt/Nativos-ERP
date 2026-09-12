import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { registerBrandFonts } from "@/lib/documents/register-fonts";
import { BRAND_COLORS, BRAND_FONTS } from "@/lib/documents/brand";
import { WordmarkPdf } from "@/lib/documents/components/wordmark-pdf";

registerBrandFonts();

const styles = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 56,
    paddingHorizontal: 40,
    fontFamily: BRAND_FONTS.sans,
    fontSize: 10,
    color: BRAND_COLORS.ink,
    backgroundColor: BRAND_COLORS.white,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: BRAND_COLORS.forest,
    paddingHorizontal: 40,
    paddingVertical: 18,
    marginHorizontal: -40,
    marginBottom: 24,
  },
  title: {
    fontFamily: BRAND_FONTS.serif,
    fontSize: 16,
    color: BRAND_COLORS.cream,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: BRAND_COLORS.goldLight,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 8,
    color: BRAND_COLORS.forestLight,
  },
});

// Layout compartilhado pelos 5 documentos + a plaquinha de recepção
// (spec seção 2 — identidade visual obrigatória em todo documento
// gerado): cabeçalho verde-floresta com o wordmark + título, rodapé com
// numeração de página, sem bullet points soltos (cada documento decide
// sua própria estrutura de tabela/lista).
export function DocumentShell({
  title,
  children,
  size = "A4",
}: {
  title: string;
  children: React.ReactNode;
  size?: "A4" | [number, number];
}) {
  return (
    <Document>
      <Page size={size} style={styles.page}>
        <View style={styles.header} fixed>
          <WordmarkPdf size={20} tone="cream-on-forest" />
          <Text style={styles.title}>{title}</Text>
        </View>
        {children}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Nativos Experiences — Trancoso, Bahia</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
