import { publicMetadata, SITE_URL } from "@/lib/public-metadata";
import Hero from "@/components/home/Hero";
import HowItWorks from "@/components/home/HowItWorks";
import Benefits from "@/components/home/Benefits";
import { blackFriday } from "@/lib/black-friday";
import styles from "@/components/home/Hero.module.css";

const homeMetadata = publicMetadata("/", "Homenageando | Músicas personalizadas", "Crie uma música personalizada para homenagear alguém especial. Ouça uma prévia antes de comprar e receba a música completa em MP3 e a letra em PDF por " + blackFriday.price + ".");
const shareImage = {
  url: `${SITE_URL}/images/og-black-friday-2026.jpg`,
  width: 1200,
  height: 630,
  alt: "Homenageando Black Friday: 25% OFF, de R$ 39,90 por R$ 29,90",
};

export const metadata = {
  ...homeMetadata,
  openGraph: { ...homeMetadata.openGraph, images: [shareImage] },
  twitter: { ...homeMetadata.twitter, images: [shareImage] },
};

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": `${SITE_URL}/#service`,
  name: "Criação de músicas personalizadas",
  serviceType: "Criação de música personalizada",
  description: "Música criada a partir da história do cliente, com prévia antes da compra e entrega da música completa em MP3 e da letra em PDF.",
  url: SITE_URL,
  provider: { "@id": `${SITE_URL}/#organization` },
  offers: {
    "@type": "Offer",
    price: (blackFriday.amountCents / 100).toFixed(2),
    priceCurrency: "BRL",
    url: SITE_URL,
  },
};

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd).replace(/</g, "\\u003c") }} />
      <aside className={styles.promotion} aria-label="Oferta Black Friday">
        <div className={styles.promotionTitle}>
          <strong>Black Friday</strong>
          <strong>{blackFriday.discountLabel}</strong>
        </div>
        <span className={styles.promotionPrice}>
          De {blackFriday.originalPrice} por <b>{blackFriday.price}</b>
        </span>
      </aside>
      <Hero />
      <HowItWorks />
      <Benefits />
    </>
  );
}
