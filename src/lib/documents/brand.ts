// Mesma paleta de src/app/globals.css (--color-forest/--color-gold/
// --color-cream/--color-ink) — repetida aqui porque @react-pdf/renderer
// não lê CSS/Tailwind, só estilos inline em JS.
export const BRAND_COLORS = {
  forest: "#233b35",
  forestLight: "#33534a",
  gold: "#c9a978",
  goldLight: "#ddc39d",
  cream: "#f8f5ee",
  ink: "#1c1c1a",
  white: "#ffffff",
} as const;

export const BRAND_FONTS = {
  serif: "Cormorant Garamond",
  sans: "Jost",
} as const;
