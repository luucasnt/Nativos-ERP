// Reprodução do wordmark "nativos" enviado pelo usuário (fundo verde-floresta
// #233b35, texto creme #f8f5ee, itálico serifado, com o ponto do "i"
// estilizado como um círculo maior, centralizado acima da palavra).
//
// Nenhum arquivo da logo foi de fato recebido nesta sessão — a imagem
// chegou apenas como conteúdo visual da conversa, sem um arquivo salvo em
// disco para copiar bit a bit. Este componente é uma reprodução fiel via
// texto real (Cormorant Garamond, já carregada no projeto) + um círculo
// decorativo posicionado em unidades `em` (por isso escala corretamente em
// qualquer tamanho). Se a fidelidade pixel-a-pixel ao arquivo original
// importar, troque por um `<Image>` apontando para o arquivo real assim
// que ele for anexado como arquivo (não apenas colado na conversa).

type WordmarkProps = {
  size?: number; // font-size em px
  tone?: "cream-on-forest" | "forest-on-cream";
  className?: string;
};

export function Wordmark({
  size = 32,
  tone = "cream-on-forest",
  className = "",
}: WordmarkProps) {
  const isCreamOnForest = tone === "cream-on-forest";

  return (
    <span
      aria-label="nativos"
      role="img"
      className={`relative inline-flex items-baseline font-serif italic select-none ${
        isCreamOnForest ? "text-cream" : "text-forest"
      } ${className}`}
      style={{ fontSize: size, lineHeight: 1 }}
    >
      nativos
      <span
        aria-hidden="true"
        className={`absolute rounded-full ${
          isCreamOnForest ? "bg-cream" : "bg-forest"
        }`}
        style={{
          width: "0.15em",
          height: "0.15em",
          left: "0.47em",
          top: "-0.46em",
        }}
      />
    </span>
  );
}

type LogoTileProps = {
  size?: number; // px, sempre quadrado
  className?: string;
};

// Versão em selo quadrado (fundo verde-floresta) — para contextos de ícone
// compacto, como no cabeçalho do painel/portais.
export function LogoTile({ size = 40, className = "" }: LogoTileProps) {
  return (
    <span
      className={`inline-flex items-center justify-center bg-forest ${className}`}
      style={{ width: size, height: size }}
    >
      <Wordmark size={size * 0.32} tone="cream-on-forest" />
    </span>
  );
}
