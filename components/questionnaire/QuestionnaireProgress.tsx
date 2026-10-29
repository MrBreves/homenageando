"use client";

import { useLayoutEffect, useState, type ReactNode } from "react";
import styles from "./QuestionnaireProgress.module.css";

type QuestionnaireProgressProps = {
  currentStep: number;
  totalSteps: number;
  children?: ReactNode;
};

export default function QuestionnaireProgress({
  currentStep,
  totalSteps,
  children,
}: QuestionnaireProgressProps) {
  const [headerHeight, setHeaderHeight] = useState(0);

  useLayoutEffect(() => {
    const header = document.querySelector<HTMLElement>(".site-header");

    if (!header) return;

    function atualizarAltura() {
      if (!header) return;

      setHeaderHeight(header.getBoundingClientRect().height);
    }

    atualizarAltura();

    const observer = new ResizeObserver(atualizarAltura);
    observer.observe(header);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={styles.progress}
      style={{ top: headerHeight }}
    >
      <span className={styles.info} aria-live="polite" aria-atomic="true">
        Etapa {currentStep} de {totalSteps}
      </span>

      <ol className={styles.boxes} aria-label="Andamento do questionário">
        {Array.from({ length: totalSteps }, (_, index) => {
          const etapa = index + 1;
          const concluida = etapa < currentStep;
          const atual = etapa === currentStep;

          const estado = concluida
            ? "concluída"
            : atual
              ? "atual"
              : "pendente";

          const className = concluida
            ? `${styles.box} ${styles.completed}`
            : atual
              ? `${styles.box} ${styles.current}`
              : styles.box;

          return (
            <li
              key={etapa}
              className={className}
              aria-current={atual ? "step" : undefined}
            >
              <span className={styles.visuallyHidden}>
                Etapa {etapa}: {estado}
              </span>
            </li>
          );
        })}
      </ol>

      {children}
    </div>
  );
}