import { StyleSheet, Text, View } from "@react-pdf/renderer";
import { BRAND_COLORS, BRAND_FONTS } from "@/lib/documents/brand";

const styles = StyleSheet.create({
  hero: {
    marginBottom: 20,
    padding: 18,
    borderRadius: 6,
    backgroundColor: BRAND_COLORS.soft,
    borderLeftWidth: 3,
    borderLeftColor: BRAND_COLORS.gold,
  },
  kicker: {
    marginBottom: 5,
    fontSize: 7.5,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: BRAND_COLORS.gold,
  },
  heroTitle: {
    fontFamily: BRAND_FONTS.serif,
    fontSize: 22,
    fontWeight: 600,
    lineHeight: 1.15,
    color: BRAND_COLORS.forest,
  },
  heroDescription: {
    marginTop: 5,
    maxWidth: 390,
    fontSize: 8.5,
    color: BRAND_COLORS.muted,
  },
  sectionHeading: {
    marginTop: 4,
    marginBottom: 8,
    fontSize: 8,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: BRAND_COLORS.forest,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 16,
  },
  gridItem: {
    minHeight: 43,
    padding: 8,
    borderWidth: 1,
    borderColor: BRAND_COLORS.line,
    borderRadius: 4,
    backgroundColor: BRAND_COLORS.white,
  },
  label: {
    marginBottom: 3,
    fontSize: 6.8,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.75,
    color: BRAND_COLORS.muted,
  },
  value: {
    fontSize: 9,
    fontWeight: 500,
    color: BRAND_COLORS.ink,
  },
  notice: {
    marginBottom: 16,
    padding: 10,
    borderRadius: 4,
    backgroundColor: "#fbf5e9",
    borderWidth: 1,
    borderColor: BRAND_COLORS.goldLight,
  },
  noticeTitle: {
    marginBottom: 3,
    fontSize: 8,
    fontWeight: 600,
    color: BRAND_COLORS.forest,
  },
  noticeText: {
    fontSize: 8,
    lineHeight: 1.45,
    color: BRAND_COLORS.muted,
  },
  instructionBox: {
    marginBottom: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: BRAND_COLORS.line,
    borderRadius: 5,
    backgroundColor: BRAND_COLORS.white,
  },
  instructionHeader: {
    marginBottom: 8,
    paddingBottom: 7,
    borderBottomWidth: 1,
    borderBottomColor: BRAND_COLORS.line,
  },
  instructionTitle: {
    fontSize: 9,
    fontWeight: 600,
    color: BRAND_COLORS.forest,
  },
  instructionSubtitle: {
    marginTop: 2,
    fontSize: 7,
    color: BRAND_COLORS.muted,
  },
  instructionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 5,
  },
  instructionNumber: {
    width: 15,
    height: 15,
    marginRight: 7,
    borderRadius: 8,
    backgroundColor: BRAND_COLORS.soft,
    borderWidth: 1,
    borderColor: BRAND_COLORS.goldLight,
    fontSize: 7,
    fontWeight: 600,
    lineHeight: 1.8,
    textAlign: "center",
    color: BRAND_COLORS.forest,
  },
  instructionText: {
    flex: 1,
    paddingTop: 1,
    fontSize: 7.7,
    lineHeight: 1.42,
    color: BRAND_COLORS.ink,
  },
  checklist: {
    marginBottom: 16,
    padding: 11,
    borderWidth: 1,
    borderColor: BRAND_COLORS.line,
    borderRadius: 5,
  },
  checklistRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  checkbox: {
    width: 10,
    height: 10,
    marginTop: 1,
    marginRight: 7,
    borderWidth: 1,
    borderColor: BRAND_COLORS.forest,
    borderRadius: 1,
  },
  checklistText: {
    flex: 1,
    fontSize: 7.8,
    lineHeight: 1.35,
    color: BRAND_COLORS.ink,
  },
  total: {
    marginTop: 10,
    marginLeft: "auto",
    width: 230,
    padding: 14,
    borderRadius: 5,
    backgroundColor: BRAND_COLORS.white,
    borderWidth: 1,
    borderColor: BRAND_COLORS.line,
    borderLeftWidth: 3,
    borderLeftColor: BRAND_COLORS.gold,
  },
  totalLabel: {
    fontSize: 7.5,
    textTransform: "uppercase",
    letterSpacing: 0.9,
    color: BRAND_COLORS.muted,
  },
  totalValue: {
    marginTop: 4,
    fontFamily: BRAND_FONTS.serif,
    fontSize: 20,
    fontWeight: 600,
    lineHeight: 1.15,
    color: BRAND_COLORS.forest,
  },
  totalNote: {
    marginTop: 5,
    fontSize: 7,
    color: BRAND_COLORS.muted,
  },
  signatures: {
    marginTop: 20,
    flexDirection: "row",
    gap: 26,
  },
  signature: {
    flex: 1,
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: BRAND_COLORS.forest,
    textAlign: "center",
  },
  signatureLabel: {
    fontSize: 7.5,
    color: BRAND_COLORS.muted,
  },
});

export function DocumentHero({
  kicker,
  title,
  description,
}: {
  kicker: string;
  title: string;
  description?: string;
}) {
  return (
    <View style={styles.hero} wrap={false}>
      <Text style={styles.kicker}>{kicker}</Text>
      <Text style={styles.heroTitle}>{title}</Text>
      {description && <Text style={styles.heroDescription}>{description}</Text>}
    </View>
  );
}

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionHeading}>{children}</Text>;
}

export function DetailGrid({
  items,
  columns = 2,
}: {
  items: Array<{ label: string; value: string }>;
  columns?: 2 | 3;
}) {
  const width = columns === 3 ? "31.9%" : "48.8%";

  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <View
          key={item.label}
          style={[styles.gridItem, { width }]}
          wrap={false}
        >
          <Text style={styles.label}>{item.label}</Text>
          <Text style={styles.value}>{item.value || "—"}</Text>
        </View>
      ))}
    </View>
  );
}

export function NoticeBox({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.notice} wrap={false}>
      <Text style={styles.noticeTitle}>{title}</Text>
      <Text style={styles.noticeText}>{children}</Text>
    </View>
  );
}

export function InstructionList({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle?: string;
  items: string[];
}) {
  return (
    <View style={styles.instructionBox} wrap={false}>
      <View style={styles.instructionHeader}>
        <Text style={styles.instructionTitle}>{title}</Text>
        {subtitle && <Text style={styles.instructionSubtitle}>{subtitle}</Text>}
      </View>
      {items.map((item, index) => (
        <View
          key={item}
          style={[
            styles.instructionRow,
            index === items.length - 1 ? { marginBottom: 0 } : {},
          ]}
        >
          <Text style={styles.instructionNumber}>{index + 1}</Text>
          <Text style={styles.instructionText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export function OperationalChecklist({ items }: { items: string[] }) {
  return (
    <View style={styles.checklist} wrap={false}>
      {items.map((item, index) => (
        <View
          key={item}
          style={[
            styles.checklistRow,
            index === items.length - 1 ? { marginBottom: 0 } : {},
          ]}
        >
          <View style={styles.checkbox} />
          <Text style={styles.checklistText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export function TotalPanel({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <View style={styles.total} wrap={false}>
      <Text style={styles.totalLabel}>{label}</Text>
      <Text style={styles.totalValue}>{value}</Text>
      {note && <Text style={styles.totalNote}>{note}</Text>}
    </View>
  );
}

export function SignatureRow({ labels }: { labels: string[] }) {
  return (
    <View style={styles.signatures} wrap={false}>
      {labels.map((label) => (
        <View key={label} style={styles.signature}>
          <Text style={styles.signatureLabel}>{label}</Text>
        </View>
      ))}
    </View>
  );
}
