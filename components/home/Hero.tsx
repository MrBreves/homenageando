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
              sizes="(max-width: 767px) 28vw, (max-width: 1199px) 10vw, 8vw"
              priority
            />
          </div>
        ))}
      </div>

      <div className={styles.heroContent}>
        <span className={styles.eyebrow}>MÚSICAS PERSONALIZADAS</span>

        <h1>
          Transforme seus sentimentos em uma{" "}
          <span className={styles.goldText}>Homenagem única.</span>
        </h1>

        <p className={styles.description}>
           Uma história especial merece uma música INESQUECÍVEL.
        </p>

        <Link href="/criar" className={styles.cta}>
          <span>Criar homenagem</span>
          <span aria-hidden="true">→</span>

        </Link>

        <span className={styles.note}>
          Você ouvirá um preview da música de 35s para conferir!
        </span>
      </div>
    </section>
  );
}
