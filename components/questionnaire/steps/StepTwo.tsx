import type { QuestionnaireAnswers } from "@/types/questionnaire";
import { getAllowedOccasions } from "@/data/questionnaire-steps";
import styles from "./StepOne.module.css";

type StepTwoProps = {
  answers: QuestionnaireAnswers;
  onChange: (
    field: keyof QuestionnaireAnswers,
    value: string,
  ) => void;
};

export default function StepTwo({
  answers,
  onChange,
}: StepTwoProps) {
  const ocasioes = getAllowedOccasions(answers.destinatario);
  const hasIncompatibleOccasion =
    answers.ocasiao !== "" && !ocasioes.includes(answers.ocasiao);

  if (ocasioes.length === 0) {
    return (
      <p>
        Volte à etapa 1 e escolha quem vai receber a homenagem.
      </p>
    );
  }

  return (
    <div className={styles.step}>
      {hasIncompatibleOccasion && (
        <p role="status">
          A ocasião salva não está disponível para esse homenageado.
          Escolha uma das opções abaixo. Para uma situação diferente,
          selecione Outra ocasião.
        </p>
      )}

      <fieldset className={styles.group}>
        <legend className={styles.legend}>Qual é a ocasião?</legend>

        <div className={styles.options}>
          {ocasioes.map((item) => (
            <button
              key={item}
              type="button"
              className={styles.option}
              onClick={() => onChange("ocasiao", item)}
              aria-pressed={answers.ocasiao === item}
            >
              <span className={styles.optionText}>{item}</span>
              <span className={styles.check} aria-hidden="true">
                {answers.ocasiao === item ? "✓" : ""}
              </span>
            </button>
          ))}
        </div>

        {answers.ocasiao === "Outra ocasião" && (
          <div className={styles.customField}>
            <label htmlFor="ocasiao-outra">
              Qual momento você quer celebrar?
            </label>
            <input
              id="ocasiao-outra"
              className={styles.input}
              type="text"
              value={answers.ocasiaoOutra}
              onChange={(event) =>
                onChange("ocasiaoOutra", event.target.value)
              }
              placeholder="Conte qual é a ocasião"
            />
          </div>
        )}
      </fieldset>
    </div>
  );
}