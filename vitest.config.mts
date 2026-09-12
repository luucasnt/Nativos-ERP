import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  // tsconfig.json usa "jsx": "preserve" (Next.js faz o próprio transform via
  // SWC) — sem isso, o transform padrão do Vite (oxc) herda "preserve" do
  // tsconfig e deixa JSX cru no output, quebrando o import-analysis. Só
  // passou a importar quando os testes de documentos (Fase 7) começaram a
  // importar componentes .tsx.
  oxc: {
    jsx: { runtime: "automatic" },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    hookTimeout: 30_000,
    testTimeout: 30_000,
  },
});
