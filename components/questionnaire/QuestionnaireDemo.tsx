"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { questionnaireDefaults } from "@/lib/questionnaire-defaults";
import { createQuestionnaireExample, updateDemoAnswer } from "@/lib/questionnaire-demo";
import { getMusicTitle } from "@/lib/music-title";
import {
  QUESTIONNAIRE_TOTAL_STEPS,
  questionnaireSteps,
  getStepThreeContent,
  getStepFourContent,
} from "@/data/questionnaire-steps";
import type { QuestionnaireAnswers } from "@/types/questionnaire";
import QuestionnaireProgress from "./QuestionnaireProgress";
import StepOne from "./steps/StepOne";
import StepTwo from "./steps/StepTwo";
import StepThree from "./steps/StepThree";
import StepFour from "./steps/StepFour";
import StepFive from "./steps/StepFive";
import StepSix from "./steps/StepSix";
import StepSeven from "./steps/StepSeven";
import pageStyles from "@/app/criar/page.module.css";
import navigationStyles from "./QuestionnaireNavigation.module.css";
import styles from "./QuestionnaireDemo.module.css";

type Access =
  | { state: "checking" }
  | { state: "denied"; message: string }
  | { state: "allowed"; userId: string };

export default function QuestionnaireDemo() {
  const [access, setAccess] = useState<Access>({ state: "checking" });

  useEffect(() => {
    let active = true;
    let verifiedUserId: string | null = null;
    let controller: AbortController | undefined;
    let expiryTimer: ReturnType<typeof setTimeout> | undefined;

    async function verifyAccess(session: Session | null) {
      controller?.abort();
      clearTimeout(expiryTimer);
      const requestController = new AbortController();
      controller = requestController;

      if (!session?.access_token) {
        verifiedUserId = null;
        setAccess({ state: "denied", message: "Entre com sua conta de administrador para acessar a demonstração." });
        return;
      }

      if (session.user.id !== verifiedUserId) {
        verifiedUserId = null;
        setAccess({ state: "checking" });
      }

      // Não confia em metadados do navegador: o endpoint existente valida
      // o token com Supabase e compara o usuário com ADMIN_USER_ID no servidor.
      try {
        const response = await fetch("/api/admin/access", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: "no-store",
          signal: AbortSignal.any([requestController.signal, AbortSignal.timeout(15000)]),
        });
        const result = await response.json();
        if (!active || requestController.signal.aborted) return;

        if (!response.ok || result.isAdmin !== true) {
          verifiedUserId = null;
          setAccess({ state: "denied", message: "O modo demonstração está disponível apenas para o administrador." });
          return;
        }

        const expiresIn = (session.expires_at ?? 0) * 1000 - Date.now();
        if (expiresIn <= 0) {
          verifiedUserId = null;
          setAccess({ state: "denied", message: "Sua sessão expirou. Entre novamente para continuar." });
          return;
        }

        verifiedUserId = session.user.id;
        setAccess({ state: "allowed", userId: session.user.id });
        expiryTimer = setTimeout(() => {
          verifiedUserId = null;
          setAccess({ state: "denied", message: "Sua sessão expirou. Entre novamente para continuar." });
        }, expiresIn);
      } catch {
        if (!active || requestController.signal.aborted) return;
        verifiedUserId = null;
        setAccess({ state: "denied", message: "Não foi possível verificar seu acesso. Atualize a página para tentar novamente." });
      }
    }

    // INITIAL_SESSION verifica a entrada; SIGNED_OUT remove o formulário.
    // Renovações revalidam o acesso sem perder as respostas do mesmo usuário.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) void verifyAccess(session);
    });

    return () => {
      active = false;
      controller?.abort();
      clearTimeout(expiryTimer);
      subscription.unsubscribe();
    };
  }, []);

  if (access.state === "allowed") {
    return <DemoQuestionnaire key={access.userId} />;
  }

  return (
    <main className={pageStyles.page}>
      <div className={pageStyles.container}>
        <h1>Modo demonstração</h1>
        <p role="status">
          {access.state === "checking" ? "Verificando acesso administrativo..." : access.message}
        </p>
        {access.state === "denied" && (
          <div className={styles.actions}>
            <Link href="/entrar" className={styles.button}>Entrar</Link>
            <Link href="/admin" className={styles.button}>Voltar ao painel</Link>
          </div>
        )}
      </div>
    </main>
  );
}

function DemoQuestionnaire() {
  // Somente memória desta tela: não importa serviços de pedido ou armazenamento.
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({ ...questionnaireDefaults });
  const [currentStep, setCurrentStep] = useState(1);
  const [notice, setNotice] = useState("");
  const stepContent = currentStep === 3
    ? getStepThreeContent(answers)
    : currentStep === 4
      ? getStepFourContent(answers)
      : questionnaireSteps.find((step) => step.step === currentStep);

  const steps = [StepOne, StepTwo, StepThree, StepFour, StepFive, StepSix, StepSeven];
  const CurrentStep = steps[currentStep - 1];

  function changeAnswer(field: keyof QuestionnaireAnswers, value: string) {
    setAnswers((current) => updateDemoAnswer(current, field, value));
    setNotice("");
  }

  return (
    <main className={`${pageStyles.page} ${pageStyles.questionnairePage}`}>
      <div className={pageStyles.container}>
        <QuestionnaireProgress currentStep={currentStep} totalSteps={QUESTIONNAIRE_TOTAL_STEPS}>
          <div className={navigationStyles.navigation}>
            <button type="button" className={navigationStyles.back} disabled={currentStep === 1}
              onClick={() => setCurrentStep((step) => Math.max(1, step - 1))}>
              ← Voltar
            </button>
            <button type="button" className={navigationStyles.next}
              onClick={() => setCurrentStep((step) => step < QUESTIONNAIRE_TOTAL_STEPS ? step + 1 : 1)}>
              {currentStep === QUESTIONNAIRE_TOTAL_STEPS ? "Voltar à primeira etapa" : "Próximo →"}
            </button>
          </div>
        </QuestionnaireProgress>

        <aside className={styles.toolbar} aria-label="Controles da demonstração">
          <strong>Modo demonstração ativo</strong>
          <p>Navegação livre. As respostas são temporárias e serão descartadas ao sair ou atualizar a página. Nenhuma música será gerada.</p>
          <div className={styles.actions}>
            <button type="button" className={styles.button} onClick={() => {
              setAnswers(createQuestionnaireExample());
              setNotice("Exemplo fictício preenchido nas oito etapas. Você pode editar as respostas.");
            }}>Preencher exemplo</button>
            <button type="button" className={styles.button} onClick={() => {
              setAnswers({ ...questionnaireDefaults });
              setNotice("Exemplo limpo. A navegação continua livre.");
            }}>Limpar exemplo</button>
            <Link href="/admin" replace prefetch={false} className={styles.button}>Sair do modo demonstração</Link>
          </div>
          <nav className={styles.steps} aria-label="Escolher etapa da demonstração">
            {questionnaireSteps.map(({ step }) => (
              <button key={step} type="button" aria-label={`Ir para etapa ${step}`}
                aria-current={currentStep === step ? "step" : undefined}
                onClick={() => setCurrentStep(step)}>{step}</button>
            ))}
          </nav>
          {notice && <p role="status">{notice}</p>}
        </aside>

        <section className={pageStyles.question}>
          <h1>{stepContent?.title}</h1>
          <p>{currentStep === 8
            ? "Você chegou à última etapa da demonstração. A geração de música está desativada neste modo."
            : stepContent?.subtitle}</p>
          {currentStep === 8 && (
            <div className={styles.musicTitle}>
              <p>Nome da sua música</p>
              <h2>{getMusicTitle(answers)}</h2>
            </div>
          )}
        </section>

        <section className={currentStep >= 3 && currentStep <= 7 ? pageStyles.remainingSteps : undefined}>
          {currentStep === 2 && !answers.destinatario
            ? <p>Use “Preencher exemplo” ou escolha o homenageado na etapa 1 para visualizar as ocasiões disponíveis. Você pode continuar navegando.</p>
            : CurrentStep && <CurrentStep answers={answers} onChange={changeAnswer} />}
        </section>
      </div>
    </main>
  );
}
