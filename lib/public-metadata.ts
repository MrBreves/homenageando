import type { Metadata } from "next";

export const SITE_URL = "https://homenageando.com.br";

export function publicMetadata(path: string, title: string, description: string): Metadata {
  const fullTitle = path === "/" ? title : `${title} | Homenageando`;
  return {
    title: path === "/" ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      siteName: "Homenageando",
      title: fullTitle,
      description,
      url: path,
      images: [{ url: `${SITE_URL}/images/og-image.jpg?v=2`, width: 1200, height: 630, alt: "Homenageando — músicas personalizadas" }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [`${SITE_URL}/images/og-image.jpg?v=2`],
    },
  };
}
