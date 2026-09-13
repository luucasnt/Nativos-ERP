import { StyleSheet, Text, View } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { DocumentShell } from "@/lib/documents/components/document-shell";
import {
  DetailGrid,
  DocumentHero,
  NoticeBox,
  SectionHeading,
  SignatureRow,
} from "@/lib/documents/components/pdf-ui";
import { BRAND_COLORS } from "@/lib/documents/brand";
import { formatDate } from "@/lib/documents/format";

const CATEGORY_ORDER = ["geral", "financeiro", "cancelamento"];

const styles = StyleSheet.create({
  clause: {
    marginBottom: 13,
  },
  clauseTitle: {
    marginBottom: 4,
    fontSize: 9.5,
    fontWeight: 600,
    color: BRAND_COLORS.forest,
  },
  clauseCategory: {
    marginBottom: 3,
    fontSize: 6.5,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: BRAND_COLORS.gold,
  },
  clauseText: {
    fontSize: 8.5,
    lineHeight: 1.55,
    textAlign: "justify",
    color: BRAND_COLORS.ink,
  },
});

export async function loadContractData(reservationId: string) {
  const reservation = await prisma.reservation.findUniqueOrThrow({
    where: { id: reservationId },
    include: {
      client: true,
      services: {
        where: { execution_status: { not: "cancelado" } },
        select: { id: true },
      },
    },
  });

  const clauses = await prisma.contractClause.findMany({
    where: { active: true },
    orderBy: [{ order: "asc" }],
  });

  const sortedClauses = [...clauses].sort((a, b) => {
    const categoryDiff =
      (CATEGORY_ORDER.includes(a.category) ? CATEGORY_ORDER.indexOf(a.category) : CATEGORY_ORDER.length) -
      (CATEGORY_ORDER.includes(b.category) ? CATEGORY_ORDER.indexOf(b.category) : CATEGORY_ORDER.length);
    if (categoryDiff !== 0) return categoryDiff;
    if (a.category !== b.category) return a.category.localeCompare(b.category, "pt-BR");
    return a.order - b.order;
  });

  return { reservation, clauses: sortedClauses };
}
export function ContractDocument({ data }: { data: Awaited<ReturnType<typeof loadContractData>> }) {
  const { reservation, clauses } = data;

  return (
    <DocumentShell title="Contrato de prestação de serviços" documentCode={reservation.code}>
      <DocumentHero
        kicker="Instrumento particular"
        title="Prestação de serviços"
        description={"Referente à reserva " + reservation.code + ", emitido em " + formatDate(new Date()) + "."}
      />

      <SectionHeading>Identificação das partes</SectionHeading>
      <DetailGrid
        columns={2}
        items={[
          {
            label: "Contratante",
            value: reservation.client.name + (reservation.client.document ? " · " + reservation.client.document : ""),
          },
          { label: "Contratada", value: "Nativos Experiences" },
          { label: "Contato do contratante", value: reservation.client.email ?? reservation.client.phone ?? "Não informado" },
          { label: "Objeto", value: reservation.services.length + " serviço(s) da reserva " + reservation.code },
        ]}
      />

      <NoticeBox title="Objeto do contrato">
        A contratada prestará os serviços de transporte, receptivo ou experiência descritos na reserva vinculada, conforme condições operacionais confirmadas entre as partes.
      </NoticeBox>

      <SectionHeading>Cláusulas e condições</SectionHeading>
      {clauses.length === 0 ? (
        <Text style={{ color: BRAND_COLORS.muted }}>
          Nenhuma cláusula ativa foi cadastrada em Configurações › Cláusulas de contrato.
        </Text>
      ) : (
        clauses.map((clause, index) => (
          <View key={clause.id} style={styles.clause} minPresenceAhead={44}>
            <Text style={styles.clauseCategory}>{clause.category}</Text>
            <Text style={styles.clauseTitle}>{index + 1}. {clause.title}</Text>
            <Text style={styles.clauseText}>{clause.content}</Text>
          </View>
        ))
      )}

      <Text style={{ marginTop: 15, fontSize: 8.5, lineHeight: 1.5, color: BRAND_COLORS.muted }}>
        As partes declaram ter lido e aceitado as condições acima, reconhecendo a validade deste documento e de sua assinatura física ou eletrônica.
      </Text>

      <SignatureRow labels={[reservation.client.name, "Nativos Experiences"]} />
    </DocumentShell>
  );
}
