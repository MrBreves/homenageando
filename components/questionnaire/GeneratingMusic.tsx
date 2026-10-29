import styles from "./GeneratingMusic.module.css";

export default function GeneratingMusic() {
  return (
    <section className={styles.container}>
      <div className={styles.content}>
        <span className={styles.note}>♫</span>

        <h1>Gerando sua música</h1>

        <p>
          Estamos transformando sua história em uma música única.
          Aguarde enquanto preparamos essa homenagem especial.
        </p>

        <div className={styles.loading}>
          <span />
          <span />
          <span />
        </div>

        <small>
          Você não precisa clicar novamente em gerar.
        </small>
      </div>
    </section>
  );
}