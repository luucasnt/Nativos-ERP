// Registra as fontes da marca (Cormorant Garamond + Jost) no
// @react-pdf/renderer, que não roda no DOM do navegador — não enxerga o
// `next/font` já usado no resto do app (src/app/layout.tsx) e precisa dos
// arquivos .ttf carregados à parte. Vendorizados em ./fonts (baixados uma
// vez do Google Fonts) em vez de referenciar uma URL remota, para a
// geração de PDF não depender de uma rede de terceiros no momento do
// request.
import path from "node:path";
import { Font } from "@react-pdf/renderer";

const FONTS_DIR = path.join(process.cwd(), "src/lib/documents/fonts");

let registered = false;

export function registerBrandFonts() {
  if (registered) {
    return;
  }

  Font.register({
    family: "Cormorant Garamond",
    fonts: [
      { src: path.join(FONTS_DIR, "cormorant-garamond-400.ttf"), fontWeight: 400 },
      { src: path.join(FONTS_DIR, "cormorant-garamond-600.ttf"), fontWeight: 600 },
      { src: path.join(FONTS_DIR, "cormorant-garamond-700.ttf"), fontWeight: 700 },
      { src: path.join(FONTS_DIR, "cormorant-garamond-italic-400.ttf"), fontWeight: 400, fontStyle: "italic" },
    ],
  });

  Font.register({
    family: "Jost",
    fonts: [
      { src: path.join(FONTS_DIR, "jost-400.ttf"), fontWeight: 400 },
      { src: path.join(FONTS_DIR, "jost-500.ttf"), fontWeight: 500 },
      { src: path.join(FONTS_DIR, "jost-600.ttf"), fontWeight: 600 },
    ],
  });

  // @react-pdf/renderer tenta hifenizar palavras por padrão, o que quebra
  // nomes próprios e valores em português de forma estranha.
  Font.registerHyphenationCallback((word) => [word]);

  registered = true;
}
