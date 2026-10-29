import Image from "next/image";
import styles from "./HowItWorks.module.css";

const steps = [
  {
    number: "01",
    icon: "✎",
    title: "Conte a história",
    description:
      "Conte quem será homenageado e compartilhe os momentos e sentimentos que tornam essa história especial.",
  },
  {
    number: "02",
    icon: "♫",
    title: "Ouça um trecho da música",
    description:
      "Sua história se transforma em uma música personalizada. Você recebe um trecho de 35 segundos para ouvir.",
  },
  {
    number: "03",
    icon: "↓",
    title: "Obtenha a música",
    description:
      "Com a compra, você recebe a música completa e a letra para baixar e guardar essa homenagem.",
  },
];

export default function HowItWorks() {
  return (
    <section className={styles.section} aria-labelledby="como-funciona">
      <div className={styles.content}>
        <div className={styles.heading}>
          <div className={styles.titleRow}>
            <Image
              className={`${styles.ornament} ${styles.ornamentLeft}`}
              src="/images/coração_esquerda.webp"
              alt=""
              aria-hidden="true"
              width={256}
              height={92}
            />
            <h2 id="como-funciona">Como funciona</h2>
            <Image
              className={`${styles.ornament} ${styles.ornamentRight}`}
              src="/images/coração_direita.webp"
              alt=""
              aria-hidden="true"
              width={256}
              height={92}
            />
          </div>
          <span className={styles.eyebrow}>SIMPLES, PERSONALIZADO E ESPECIAL</span>
          <p>Da sua história até uma música criada para emocionar.</p>
        </div>

        <div className={styles.steps}>
          {steps.map((step) => (
            <article
              className={styles.card}
              key={step.number}
              id={step.number === "03" ? "fim-como-funciona" : undefined}
            >
              <div className={styles.cardTop}>
                <span className={styles.icon} aria-hidden="true">
                  {step.icon}
                </span>
                <span className={styles.number}>{step.number}</span>
              </div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
