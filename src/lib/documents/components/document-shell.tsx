import type { DocumentCompany } from "@/lib/documents/company";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { registerBrandFonts } from "@/lib/documents/register-fonts";
import { BRAND_COLORS, BRAND_FONTS } from "@/lib/documents/brand";

registerBrandFonts();

// Evite lineHeight numérico: o renderer 4.9 reaplica a conversão em cada
// etapa de paginação. As métricas das fontes mantêm texto e rodapé legíveis.
const styles = StyleSheet.create({
  page: {
    paddingTop: 84,
    paddingBottom: 86,
    paddingHorizontal: 38,
    fontFamily: BRAND_FONTS.sans,
    fontSize: 9.5,
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
  footerText: {
    fontSize: 7,
    color: BRAND_COLORS.muted,
  },
  pageNumber: {
    height: 12,
    fontSize: 7,
    fontWeight: 600,
    color: BRAND_COLORS.forest,
  },
});

export function DocumentShell({
  title,
  company,
  documentCode,
  passengerName,
  issuedAt = new Date(),
  children,
  size = "A4",
}: {
  company?: DocumentCompany;
  title: string;
  documentCode?: string;
  passengerName?: string;
  issuedAt?: Date;
  children: React.ReactNode;
  size?: "A4" | [number, number];
}) {
  const footerLines = [
    (company?.name ?? "Nativos Experiences") + (company?.document ? " - CNPJ/CPF " + company.document : ""),
    [company?.address, [company?.city, company?.state].filter(Boolean).join(" / ")].filter(Boolean).join(" - "),
    [company?.phone, company?.email, company?.website?.replace(/^https?:\/\//, "").replace(/\/$/, "")].filter(Boolean).join(" | "),
    company?.footer,
    "Obrigado por escolher a Nativos Experiences.",
  ].filter(Boolean).join("\n");

  return (
    <Document title={["Nativos", title, passengerName, documentCode].filter(Boolean).join(" - ")} author="Nativos Experiences" subject={documentCode}>
      <Page size={size} style={styles.page}>
        <View style={styles.topBar} fixed />
        <View style={styles.header} fixed wrap={false}>
          <Text style={{ fontFamily: BRAND_FONTS.serif, fontStyle: "italic", fontSize: 30, color: BRAND_COLORS.forest }}>nativos</Text>
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>{title}</Text>
            <Text style={styles.headerMeta}>
              {documentCode ? documentCode + " · " : ""}
              Emitido em {issuedAt.toLocaleDateString("pt-BR", { timeZone: "America/Bahia" })}
            </Text>
          </View>
        </View>

        {children}

        <Text
          fixed
          style={[styles.footerText, { position: "absolute", bottom: 25, left: 38, width: 440, height: 55 }]}
          render={({ pageNumber, totalPages }) => !totalPages || pageNumber === totalPages ? footerLines : ""}
        />
          <Text
            fixed
            style={[styles.pageNumber, { position: "absolute", bottom: 16, right: 38, width: 70, textAlign: "right" }]}
            render={({ pageNumber, totalPages }) =>
              "Página " + pageNumber + " de " + totalPages
            }
          />
      </Page>
    </Document>
  );
}
