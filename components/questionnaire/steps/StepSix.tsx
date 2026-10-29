import type { QuestionnaireAnswers } from "@/types/questionnaire";

type StepSixProps = {
  answers: QuestionnaireAnswers;
  onChange: (
    field: keyof QuestionnaireAnswers,
    value: string,
  ) => void;
};

export default function StepSix({
  answers,
  onChange,
}: StepSixProps) {
  return (
    <div>
      <label>
        O que você gostaria de dizer para essa pessoa?

        <textarea
          value={answers.mensagemFinal}
          onChange={(event) =>
            onChange("mensagemFinal", event.target.value)
          }
          placeholder="Escreva com suas palavras. Pode ser uma declaração, agradecimento, desejo ou algo que você nunca conseguiu dizer..."
          rows={6}
        />
      </label>
    </div>
  );
}