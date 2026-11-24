import { publicMetadata, SITE_URL } from "@/lib/public-metadata";
import Hero from "@/components/home/Hero";
import HowItWorks from "@/components/home/HowItWorks";
import Benefits from "@/components/home/Benefits";

export const metadata = publicMetadata("/", "Homenageando | Músicas personalizadas", "Crie uma música personalizada para homenagear alguém especial. Ouça uma prévia antes de comprar e receba a música completa em MP3 e a letra em PDF por R$ 39,90.");

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
    price: "39.90",
    priceCurrency: "BRL",
    url: SITE_URL,
  },
};

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd).replace(/</g, "\\u003c") }} />
      <Hero />
      <HowItWorks />
      <Benefits />
    </>
  );
}
