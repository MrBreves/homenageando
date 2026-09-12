import styles from "./Benefits.module.css";

const benefits = [
  {
    icon: "♡",
    title: "Momentos reais",
    text: "Histórias que viram músicas inesquecíveis.",
  },
  {
    icon: "♢",
    title: "Seguro e confiável",
    text: "Seus dados protegidos e privacidade garantida.",
  },
  {
    icon: "♧",
    title: "Para todas as ocasiões",
    text: "Amor, família, amizade, conquistas e muito mais.",
  },
];

export default function Benefits() {
  return (
    <section className={styles.section} aria-label="Benefícios">
      <div className={styles.items}>
        {benefits.map((item) => (
          <article className={styles.item} key={item.title}>
            <span className={styles.icon} aria-hidden="true">{item.icon}</span>
            <div>
              <h2>{item.title}</h2>
              <p>{item.text}</p>
            </div>
          </article>
        ))}
      </div>

      <div className={styles.signature}>
        <span />
        <p>MAIS QUE MÚSICAS, ETERNIZAMOS SENTIMENTOS</p>
        <span />
      </div>
      <div className={styles.heart} aria-hidden="true">♥</div>
    </section>
  );
}
