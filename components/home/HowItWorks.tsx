import Image from "next/image";
import styles from "./HowItWorks.module.css";

const steps = [
  {
    number: "01",
    icon: "✎",
    title: "Conte a história",
    description:
      "Conte quem será homenageado, compartilhe os momentos, sentimentos e detalhes que tornam essa história especial.",
  },
  {
    number: "02",
    icon: "♫",
    title: "Ouça um trecho da música",
    description:
      "Nossa inteligência artificial transforma sua história em uma música personalizada. Você recebe um preview de 35 segundos para ouvir.",
  },
  {
    number: "03",
    icon: "↓",
    title: "Obtenha a música",
    description:
      "Com a compra, você recebe a música completa e a letra para baixar e guardar essa homenagem para sempre.",
  },
  {
    number: "04",
    icon: "↻",
    title: "Gere uma variação",
    description:
      "Você pode editar a letra e os arranjos e gerar uma nova versão da música, gratuitamente, com a nova letra para baixar.",
  },
  {
    number: "05",
    icon: "↗",
    title: "Compartilhe emoção",
    description:
      "Baixe suas músicas e letras ou compartilhe a homenagem diretamente no celular com quem você quiser.",
  },
];

export default function HowItWorks() {
  return (
    <section className={styles.section} aria-labelledby="como-funciona">
      <div className={styles.content}>
       <div className={styles.heading}>
  <span className={styles.eyebrow}>SIMPLES, PERSONALIZADO E ESPECIAL</span>

  <div className={styles.titleRow}>
    <Image
      src="/images/seta_esquerda.webp"
      alt=""
      width={180}
      height={60}
      className={styles.arrow}
      aria-hidden="true"
    />

    <h2 id="como-funciona">Como funciona</h2>

    <Image
      src="/images/seta_direita.webp"
      alt=""
      width={180}
      height={60}
      className={styles.arrow}
      aria-hidden="true"
    />
  </div>

  <p>Da sua história até uma música criada para emocionar.</p>
</div>

        <div className={styles.steps}>
          {steps.map((step) => (
            <article className={styles.card} key={step.number}>
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
