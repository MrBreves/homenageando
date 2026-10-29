type QuestionnaireNavigationProps = {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
};

import styles from "./QuestionnaireNavigation.module.css";

export default function QuestionnaireNavigation({
  currentStep,
  totalSteps,
  onBack,
  onNext,
}: QuestionnaireNavigationProps) {
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;

  return (
    <div className={styles.navigation}>
      <button
        className={styles.back}
        type="button"
        onClick={onBack}
        disabled={isFirstStep}
      >
        ← Voltar
      </button>

      <button
        className={styles.next}
        type="button"
        onClick={onNext}
      >
        {isLastStep ? "Gerar música" : "Próximo →"}
      </button>
    </div>
  );
}