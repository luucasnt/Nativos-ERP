import Image from "next/image";

type WordmarkProps = {
  size?: number;
  tone?: "cream-on-forest" | "forest-on-cream";
  className?: string;
  priority?: boolean;
};

const WORDMARK_RATIO = 2617 / 700;

export function Wordmark({
  size = 32,
  tone = "cream-on-forest",
  className = "",
  priority = false,
}: WordmarkProps) {
  const src =
    tone === "cream-on-forest"
      ? "/brand/nativos-wordmark-cream.svg"
      : "/brand/nativos-wordmark-green.svg";

  return (
    <Image
      src={src}
      alt="Nativos"
      width={Math.round(size * WORDMARK_RATIO)}
      height={size}
      priority={priority}
      className={`h-auto select-none ${className}`}
    />
  );
}

type LogoTileProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

export function LogoTile({ size = 40, className = "", priority = false }: LogoTileProps) {
  return (
    <Image
      src="/brand/nativos-icon-square.svg"
      alt="Nativos"
      width={size}
      height={size}
      priority={priority}
      className={`select-none ${className}`}
    />
  );
}
