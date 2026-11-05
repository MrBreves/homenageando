import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import Script from "next/script";
import "./globals.css";

import Header from "@/components/layout/Header";
import Navigation from "@/components/layout/Navigation";
import Footer from "@/components/layout/Footer";
import OpenAIAdsConsent from "@/components/OpenAIAdsConsent";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
    icon: [
      {
        url: "/images/icone_logo.webp?v=2",
        type: "image/webp",
      },
    ],
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
      className={`${geistSans.variable} ${geistMono.variable} ${playfairDisplay.variable}`}
    >
      <body>
        <Script id="google-tag-manager" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){
              w[l]=w[l]||[];
              w[l].push({
                'gtm.start': new Date().getTime(),
                event:'gtm.js'
              });
              var f=d.getElementsByTagName(s)[0],
                  j=d.createElement(s),
                  dl=l!='dataLayer'?'&l='+l:'';
              j.async=true;
              j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
              f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-MWB9VWHD');
          `}
        </Script>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-MWB9VWHD"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <Header />
        <Navigation />
        <main>{children}</main>
        <Footer />
        <OpenAIAdsConsent />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
