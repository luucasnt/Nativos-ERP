import { View, Text } from "@react-pdf/renderer";
import { BRAND_COLORS, BRAND_FONTS } from "@/lib/documents/brand";

// Mesma reprodução do wordmark de src/components/brand/logo.tsx
// (Wordmark), só que com offsets em pt em vez de `em` — o layout do
// @react-pdf/renderer (Yoga) não entende unidades relativas ao
// font-size.
export function WordmarkPdf({
  size = 20,
  tone = "cream-on-forest",
}: {
  size?: number;
  tone?: "cream-on-forest" | "forest-on-cream";
}) {
  const color = tone === "cream-on-forest" ? BRAND_COLORS.cream : BRAND_COLORS.forest;

  return (
    <View style={{ position: "relative" }}>
      <Text style={{ fontFamily: BRAND_FONTS.serif, fontStyle: "italic", fontSize: size, color }}>nativos</Text>
      <View
        style={{
          position: "absolute",
          width: size * 0.15,
          height: size * 0.15,
          borderRadius: size * 0.075,
          backgroundColor: color,
          left: size * 0.47,
          top: -size * 0.46,
        }}
      />
    </View>
  );
}
