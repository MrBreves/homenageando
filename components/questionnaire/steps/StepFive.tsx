import type { QuestionnaireAnswers } from "@/types/questionnaire";

type StepFiveProps = {
  answers: QuestionnaireAnswers;
  onChange: (
    field: keyof QuestionnaireAnswers,
    value: string,
  ) => void;
};

export default function StepFive({
  answers,
  onChange,
}: StepFiveProps) {
  return (
    <div>
      <label>
        Quais qualidades mais representam essa pessoa?

        <textarea
          value={answers.qualidades}
          onChange={(event) =>
            onChange("qualidades", event.target.value)
          }
          placeholder="Ex: carinhosa, divertida, forte, companheira..."
          rows={4}
        />
      </label>

      <label>
        Conte uma lembrança ou momento marcante de vocês

        <textarea
          value={answers.memoriaMarcante}
          onChange={(event) =>
            onChange("memoriaMarcante", event.target.value)
          }
          placeholder="Ex: uma viagem, um encontro, uma conquista, uma situação especial..."
          rows={5}
        />
      </label>
    </div>
  );
}