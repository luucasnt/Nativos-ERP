// Nenhum arquivo de logo foi de fato anexado a esta sessão (o prompt
// original menciona "vou te passar o arquivo da logo", mas nenhum arquivo
// chegou). Este é um placeholder tipográfico fiel à descrição — monograma
// "n" itálico, Cormorant Garamond — até o arquivo real da marca ser
// fornecido e usado no lugar deste componente.

type LogoProps = {
  size?: number;
  tone?: "gold-on-forest" | "forest-on-cream";
  className?: string;
};

export function Logo({
  size = 40,
  tone = "gold-on-forest",
  className = "",
}: LogoProps) {
  const isGoldOnForest = tone === "gold-on-forest";

  return (
    <span
      aria-label="Nativos"
      role="img"
      className={`inline-flex items-center justify-center rounded-full font-serif italic select-none ${
        isGoldOnForest ? "bg-forest text-gold" : "bg-transparent text-forest"
      } ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.62,
        lineHeight: 1,
      }}
    >
      n
    </span>
  );
}
