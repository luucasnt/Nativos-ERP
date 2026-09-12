import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Favicon gerado em build/request time (sem dependência de um arquivo de
// imagem) — monograma "n" itálico, fiel à descrição original da marca,
// já que em tamanho de favicon o wordmark completo ("nativos") não seria
// legível.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#233b35",
        }}
      >
        <span
          style={{
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            fontSize: 22,
            color: "#f8f5ee",
          }}
        >
          n
        </span>
      </div>
    ),
    { ...size },
  );
}
