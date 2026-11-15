import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Homenageando | Músicas personalizadas",
    short_name: "Homenageando",
    description: "Músicas personalizadas para transformar histórias e sentimentos em homenagens únicas.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fffaf2",
    theme_color: "#fffaf2",
    lang: "pt-BR",
    icons: [
      {
        src: "/images/png/icone_logo_192.png?v=3",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/png/icone_logo_512.png?v=3",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
