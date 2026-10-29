import styles from "./Benefits.module.css";

const benefits = [
  {
    icon: "♡",
    title: "Momentos reais",
    text: "Histórias que viram músicas inesquecíveis.",
  },
  {
    icon: (
      <svg
        width="30"
        height="30"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        focusable="false"
      >
        <path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z" />
        <path d="m8.5 12 2.5 2.5 4.5-5" />
      </svg>
    ),
    title: "Seguro e confiável",
    text: "Seus dados protegidos e privacidade garantida.",
  },
  {
    icon: (
      <svg
        width="30"
        height="30"
        viewBox="0 0 32 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        focusable="false"
      >
        <g transform="rotate(20 9 16)">
          <path d="M5 5h8v8a4 4 0 0 1-8 0V5Z" />
          <path d="M5 10h8M9 17v10M5 27h8" />
        </g>
        <g transform="rotate(-20 23 16)">
          <path d="M19 5h8v8a4 4 0 0 1-8 0V5Z" />
          <path d="M19 10h8M23 17v10M19 27h8" />
        </g>
        <path d="M16 1v2" />
      </svg>
    ),
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

    </section>
  );
}
