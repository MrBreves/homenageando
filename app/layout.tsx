import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import Header from "@/components/layout/Header";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Homenageando | Músicas personalizadas",
    template: "%s | Homenageando",
  },
  description:
    "Crie uma música personalizada para homenagear alguém especial e transformar sua história em uma lembrança inesquecível.",
  applicationName: "Homenageando",
  keywords: [
    "música personalizada",
    "música de homenagem",
    "presente personalizado",
    "homenagem",
    "música com inteligência artificial",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Homenageando",
    title: "Homenageando | Músicas personalizadas",
    description:
      "Transforme seus sentimentos em uma homenagem única com uma música criada a partir da sua história.",
    url: "/",
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Homenageando — músicas personalizadas",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Homenageando | Músicas personalizadas",
    description:
      "Transforme seus sentimentos em uma homenagem única.",
    images: ["/images/og-image.jpg"],
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Homenageando",
    url: siteUrl,
    description:
      "Músicas personalizadas para transformar histórias e sentimentos em homenagens únicas.",
    inLanguage: "pt-BR",
  };

  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>
        <Header />
        <Navigation />
        <main>{children}</main>
        <Footer />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
