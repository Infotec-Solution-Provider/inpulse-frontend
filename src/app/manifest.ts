import type { MetadataRoute } from "next";
import { frontendAssetPath } from "@/lib/frontend-versions";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "InPulse",
    short_name: "InPulse",
    description: "CRM InPulse com atendimento, notificacoes e operacao em tempo real.",
    start_url: frontendAssetPath("/"),
    scope: frontendAssetPath("/"),
    display: "standalone",
    background_color: "#020617",
    theme_color: "#0f172a",
    lang: "pt-BR",
    orientation: "portrait",
    icons: [
      {
        src: frontendAssetPath("/icon"),
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: frontendAssetPath("/icon"),
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: frontendAssetPath("/apple-icon"),
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
