import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nativos ERP",
    short_name: "Nativos",
    description: "Gestão operacional e financeira da Nativos Experiences",
    start_url: "/login",
    display: "standalone",
    background_color: "#f6f3eb",
    theme_color: "#173d32",
    lang: "pt-BR",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/brand/nativos-icon-square.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
