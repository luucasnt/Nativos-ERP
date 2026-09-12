import { Text, View } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { DocumentShell } from "@/lib/documents/components/document-shell";
import { BRAND_COLORS, BRAND_FONTS } from "@/lib/documents/brand";
import { formatDate } from "@/lib/documents/format";

// INFERIDO: a spec não define quais cláusulas entram em "o contrato" nem
// a ordem entre categorias — só que ContractClause tem `category`/`order`
// reutilizáveis. Adotado: todas as cláusulas ativas, agrupadas por
// categoria (geral primeiro, depois financeiro/cancelamento, o resto em
// ordem alfabética) e ordenadas por `order` dentro de cada categoria —
// nenhuma seleção manual de cláusula por contrato foi construída.
const CATEGORY_ORDER = ["geral", "financeiro", "cancelamento"];

export async function loadContractData(reservationId: string) {
  const reservation = await prisma.reservation.findUniqueOrThrow({
    where: { id: reservationId },
    include: { client: true },
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
    return a.order - b.order;
  });

  return { reservation, clauses: sortedClauses };
}

export function ContractDocument({ data }: { data: Awaited<ReturnType<typeof loadContractData>> }) {
  const { reservation, clauses } = data;

  return (
    <DocumentShell title="Contrato de Prestação de Serviços">
      <Text style={{ marginBottom: 4 }}>
        Contratante: {reservation.client.name}
        {reservation.client.document ? ` (${reservation.client.document})` : ""}
      </Text>
      <Text style={{ marginBottom: 4 }}>Contratada: Nativos Experiences</Text>
      <Text style={{ marginBottom: 18, color: BRAND_COLORS.forestLight }}>
        Referente à reserva {reservation.code} — {formatDate(new Date())}
      </Text>

      {clauses.length === 0 ? (
        <Text>Nenhuma cláusula cadastrada em Configurações &gt; Cláusulas de contrato.</Text>
      ) : (
        clauses.map((clause, index) => (
          <View key={clause.id} style={{ marginBottom: 12 }} wrap={false}>
            <Text style={{ fontFamily: BRAND_FONTS.serif, fontSize: 12, color: BRAND_COLORS.forest, marginBottom: 3 }}>
              {index + 1}. {clause.title}
            </Text>
            <Text>{clause.content}</Text>
          </View>
        ))
      )}
    </DocumentShell>
  );
}
