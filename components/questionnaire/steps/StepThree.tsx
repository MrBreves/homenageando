import { getStepThreeContent } from "@/data/questionnaire-steps";
import type { QuestionnaireAnswers } from "@/types/questionnaire";

type StepThreeProps = {
  answers: QuestionnaireAnswers;
  onChange: (
    field: keyof QuestionnaireAnswers,
    value: string,
  ) => void;
};

export default function StepThree({
  answers,
  onChange,
}: StepThreeProps) {
  const content = getStepThreeContent(answers);

  return (
    <div>
      <label>
        {content.shortLabel}

        <input
          type="text"
          value={answers[content.shortField]}
          onChange={(event) =>
            onChange(content.shortField, event.target.value)
          }
          placeholder={content.shortPlaceholder}
        />
      </label>

      <label>
        {content.storyLabel}

        <textarea
          value={answers.historiaRelacao}
          onChange={(event) =>
            onChange("historiaRelacao", event.target.value)
          }
          placeholder={content.storyPlaceholder}
          rows={5}
        />
      </label>
    </div>
  );
}