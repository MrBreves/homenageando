import Image from "next/image";
import Link from "next/link";
import styles from "./Hero.module.css";

const photos = [
  {
    src: "/images/casal.webp",
    alt: "Casal celebrando uma história de amor",
    className: "couple",
  },
  {
    src: "/images/familia.webp",
    alt: "Família reunida em um momento especial",
    className: "family",
  },
  {
    src: "/images/casamento.webp",
    alt: "Casal celebrando o casamento",
    className: "wedding",
  },
  {
    src: "/images/formatura.webp",
    alt: "Formandos celebrando uma conquista",
    className: "graduation",
  },
];

export default function Hero() {
  return (
    <section className={styles.hero} id="criar">
      <div className={styles.decor} aria-hidden="true">
        <span className={styles.heart}>♡</span>
        <span className={styles.heartTwo}>♡</span>
        <span className={styles.ribbonOne} />
        <span className={styles.ribbonTwo} />
      </div>

      <div className={styles.photoLayer} aria-hidden="true">
        {photos.map((photo) => (
          <div
            className={`${styles.photo} ${styles[photo.className]}`}
            key={photo.src}
          >
            <Image
              src={photo.src}
              alt=""
              fill
              sizes="(max-width: 700px) 42vw, 240px"
              priority
            />
          </div>
        ))}
      </div>

      <div className={styles.heroContent}>
        <span className={styles.eyebrow}>MÚSICAS PERSONALIZADAS</span>

        <h1>
          Transforme seus sentimentos em uma{" "}
          <span>homenagem única.</span>
        </h1>

        <p className={styles.description}>
          Crie sua música personalizada para homenagear alguém especial e
          transformar sua história em uma lembrança inesquecível.
        </p>

        <Link href="/criar" className={styles.cta}>
          Criar minha homenagem <span aria-hidden="true">→</span>
        </Link>

        <span className={styles.note}>
          Você ouvirá um preview de 35 segundos antes de comprar.
        </span>
      </div>
    </section>
  );
}
