import Image from "next/image";
import styles from "./HowItWorks.module.css";

const steps = [
  {
    number: "01",
    icon: "✎",
    title: "Conte a história",
    description:
      "Entre na sua conta e conte a história, a ocasião e os sentimentos de quem será homenageado.",
  },
  {
    number: "02",
    icon: "♫",
    title: "Ouça um trecho da música",
    description:
      "Criamos sua música personalizada com inteligência artificial. Ouça uma prévia de 35 segundos antes de comprar.",
  },
  {
    number: "03",
    icon: "↓",
    title: "Obtenha a música",
    description:
      "Após a aprovação do pagamento, baixe a música completa em MP3 e a letra em PDF.",
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
