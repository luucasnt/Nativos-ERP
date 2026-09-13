import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { registerBrandFonts } from "@/lib/documents/register-fonts";
import { BRAND_COLORS, BRAND_FONTS } from "@/lib/documents/brand";
import { WordmarkPdf } from "@/lib/documents/components/wordmark-pdf";
import { formatDate } from "@/lib/documents/format";

registerBrandFonts();

const styles = StyleSheet.create({
  page: {
    paddingTop: 92,
    paddingBottom: 58,
    paddingHorizontal: 38,
    fontFamily: BRAND_FONTS.sans,
    fontSize: 9.5,
    lineHeight: 1.45,
    color: BRAND_COLORS.ink,
    backgroundColor: BRAND_COLORS.white,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 5,
    backgroundColor: BRAND_COLORS.forest,
  },
  header: {
    position: "absolute",
    top: 25,
    left: 38,
    right: 38,
    height: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: BRAND_COLORS.line,
  },
  headerRight: {
    alignItems: "flex-end",
    maxWidth: 280,
  },
  headerTitle: {
    fontSize: 8,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: BRAND_COLORS.forest,
  },
  headerMeta: {
    marginTop: 4,
    fontSize: 7.5,
    color: BRAND_COLORS.muted,
  },
  footer: {
    position: "absolute",
    bottom: 22,
    left: 38,
    right: 38,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: BRAND_COLORS.line,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 7,
    color: BRAND_COLORS.muted,
  },
  pageNumber: {
    fontSize: 7,
    fontWeight: 600,
    color: BRAND_COLORS.forest,
  },
});

export function DocumentShell({
  title,
  documentCode,
  issuedAt = new Date(),
  children,
  size = "A4",
}: {
  title: string;
  documentCode?: string;
  issuedAt?: Date;
  children: React.ReactNode;
  size?: "A4" | [number, number];
}) {
  return (
    <Document title={title} author="Nativos Experiences" subject={documentCode}>
      <Page size={size} style={styles.page}>
        <View style={styles.topBar} fixed />
        <View style={styles.header} fixed>
          <WordmarkPdf size={23} tone="forest-on-cream" />
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>{title}</Text>
            <Text style={styles.headerMeta}>
              {documentCode ? documentCode + " · " : ""}
              Emitido em {formatDate(issuedAt)}
            </Text>
          </View>
        </View>

        {children}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Nativos Experiences · Trancoso, Bahia</Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => "Página " + pageNumber + " de " + totalPages}
          />
        </View>
      </Page>
    </Document>
  );
}
