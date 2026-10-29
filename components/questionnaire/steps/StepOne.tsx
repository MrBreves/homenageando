import type { QuestionnaireAnswers } from "@/types/questionnaire";
import { questionnaireRecipients } from "@/data/questionnaire-steps";
import styles from "./StepOne.module.css";
import nameStyles from "./StepTwo.module.css";

type StepOneProps = {
  answers: QuestionnaireAnswers;
  onChange: (
    field: keyof QuestionnaireAnswers,
    value: string,
  ) => void;
};

const destinatarios = questionnaireRecipients;

export default function StepOne({
  answers,
  onChange,
}: StepOneProps) {
  return (
    <div className={styles.step}>
      <fieldset className={styles.group}>
        <legend className={styles.legend}>Quem você quer homenagear?</legend>

        <div className={styles.options}>
          {destinatarios.map((item) => (
            <button
              key={item}
              type="button"
              className={styles.option}
              onClick={() => onChange("destinatario", item)}
              aria-pressed={answers.destinatario === item}
            >
              <span className={styles.optionText}>{item}</span>
              <span className={styles.check} aria-hidden="true">
                {answers.destinatario === item ? "✓" : ""}
              </span>
            </button>
          ))}
        </div>

        {answers.destinatario === "Outro" && (
          <div className={styles.customField}>
            <label htmlFor="destinatario-outro">
              Quem vai receber essa homenagem?
            </label>
            <input
              id="destinatario-outro"
              className={styles.input}
              type="text"
              value={answers.destinatarioOutro}
              onChange={(event) =>
                onChange("destinatarioOutro", event.target.value)
              }
              placeholder="Ex.: minha professora"
            />
          </div>
        )}
      </fieldset>

      <div className={nameStyles.step}>
        <div className={nameStyles.fields}>
          <div className={nameStyles.field}>
            <label htmlFor="nome-usuario" className={nameStyles.label}>
              Seu primeiro nome ou apelido
            </label>

            <input
              id="nome-usuario"
              className={nameStyles.input}
              type="text"
              value={answers.nomeUsuario}
              onChange={(event) =>
                onChange("nomeUsuario", event.target.value)
              }
              placeholder="Ex.: Ana"
              aria-describedby="orientacao-nomes"
            />
          </div>

          <div className={nameStyles.field}>
            <label htmlFor="nome-homenageado" className={nameStyles.label}>
              Nome de quem vai receber a música
            </label>

            <input
              id="nome-homenageado"
              className={nameStyles.input}
              type="text"
              value={answers.nomeHomenageado}
              onChange={(event) =>
                onChange("nomeHomenageado", event.target.value)
              }
              placeholder="A pessoa que vai receber a música"
              aria-describedby="orientacao-nomes"
            />
          </div>
        </div>

        <p id="orientacao-nomes" className={nameStyles.hint}>
          Escreva o nome exatamente como é falado, com acentos quando necessário.
        </p>
      </div>
    </div>
  );
}