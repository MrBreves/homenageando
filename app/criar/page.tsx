"use client";

import { useEffect, useRef, useState } from "react";



import styles from "./page.module.css";

import GeneratingMusic from "@/components/questionnaire/GeneratingMusic";
import QuestionnaireNavigation from "@/components/questionnaire/QuestionnaireNavigation";
import QuestionnaireProgress from "@/components/questionnaire/QuestionnaireProgress";

import StepOne from "@/components/questionnaire/steps/StepOne";
import StepTwo from "@/components/questionnaire/steps/StepTwo";
import StepThree from "@/components/questionnaire/steps/StepThree";
import StepFour from "@/components/questionnaire/steps/StepFour";
import StepFive from "@/components/questionnaire/steps/StepFive";
import StepSix from "@/components/questionnaire/steps/StepSix";
import StepSeven from "@/components/questionnaire/steps/StepSeven";

import {
  questionnaireSteps,
  QUESTIONNAIRE_TOTAL_STEPS,
  getStepThreeContent,
  getStepFourContent,
  isOccasionAllowed,
  validateQuestionnaire,
} from "@/data/questionnaire-steps";

import {
  questionnaireDefaults,
  normalizeQuestionnaireAnswers,
} from "@/lib/questionnaire-defaults";
import { supabase } from "@/lib/supabase";

import {
  createUserOrder,
  getCurrentUserOrder,
  updateUserOrderDraft,
  type Order,
} from "@/lib/order-service";

import {
  clearQuestionnaireDraft,
  loadQuestionnaireDraft,
  loadQuestionnaireStep,
  savePreviewAuthPending,
  saveQuestionnaireDraft,
  saveQuestionnaireStep,
} from "@/lib/questionnaire-storage";

import type { QuestionnaireAnswers } from "@/types/questionnaire";
import { getMusicTitle } from "@/lib/music-title";

export default function CriarPage() {

  const [currentStep, setCurrentStep] = useState(1);

  const confirmationRef = useRef<HTMLDialogElement>(null);
  const validationRef = useRef<HTMLDialogElement>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const dialog = validationRef.current;

    if (!validationMessage || !dialog) {
      return;
    }

    dialog.showModal();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [validationMessage]);

  const [pendingChange, setPendingChange] = useState<{
    field: keyof QuestionnaireAnswers;
    value: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    const dialog = confirmationRef.current;

    if (!pendingChange || !dialog) {
      return;
    }

    dialog.showModal();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [pendingChange]);

          const [questionnaireState, setQuestionnaireState] = useState<
    | "CARREGANDO"
    | "EDITAVEL"
    | "AGUARDANDO_LOGIN_PREVIEW"
    | "GERANDO_MUSICA"
    | "PREVIEW_PAGAMENTO"
    | "PAGAMENTO"
    | "PAGAMENTO_CONFIRMADO"
  >("CARREGANDO");

    const [answers, setAnswers] = useState<QuestionnaireAnswers>(
    questionnaireDefaults,
  );

    const [previewPlayCount, setPreviewPlayCount] = useState(0);
  const [paymentStarted, setPaymentStarted] = useState(false);
  const [startingPayment, setStartingPayment] = useState(false);
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);

  const [paymentError, setPaymentError] = useState<string | null>(null);

  const [couponEnabled, setCouponEnabled] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponValidating, setCouponValidating] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountType: "PERCENT" | "FIXED";
    discountPercent: number | null;
    discountFixedCents: number | null;
    originalAmountCents: number;
    discountAmountCents: number;
    totalAmountCents: number;
  } | null>(null);

  const [orderReference, setOrderReference] = useState<Pick<Order, "id" | "os_number"> | null>(null);

    const previewAudioRef = useRef<HTMLAudioElement>(null);
  const previewRequestRef = useRef(false);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewCanResume, setPreviewCanResume] = useState(false);
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);

  useEffect(() => {
    if (questionnaireState !== "PREVIEW_PAGAMENTO") {
      previewAudioRef.current?.pause();
    }
  }, [questionnaireState]);

    const orderSummary = orderReference ? (
    <p style={{ overflowWrap: "anywhere", lineHeight: 1.5 }}>
      <strong>OS {String(orderReference.os_number).padStart(4, "0")}</strong>
    </p>
  ) : null;

    useEffect(() => {
    const timer = window.setTimeout(() => {
      async function loadInitialData() {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          sessionStorage.setItem(
            "homenageando_login_return",
            "/criar"
          );

          window.location.replace("/entrar");
          return;
        }

        const previewAuthPending =
          localStorage.getItem("homenageando_preview_auth_pending") === "true";

        if (user) {
          const order = await getCurrentUserOrder();

          if (order) {
            let restoredOrder = order;

            if (
              previewAuthPending &&
              order.state === "QUESTIONÁRIO_ABERTO"
            ) {
              const savedDraft = loadQuestionnaireDraft();

              if (savedDraft) {
                try {
                  restoredOrder = await updateUserOrderDraft(
                    order.id,
                    normalizeQuestionnaireAnswers(savedDraft),
                    QUESTIONNAIRE_TOTAL_STEPS,
                  );

                  clearQuestionnaireDraft();
                  saveQuestionnaireStep(1);
                  savePreviewAuthPending(false);
                } catch (error) {
                  console.error(
                    "Falha ao salvar questionário após login:",
                    error,
                  );
                  setAnswers(normalizeQuestionnaireAnswers(savedDraft));
                  setCurrentStep(QUESTIONNAIRE_TOTAL_STEPS);
                  setValidationMessage(
                    "Não foi possível salvar suas respostas. Tente novamente.",
                  );
                  setQuestionnaireState("EDITAVEL");
                  return;
                }
              }
            }

            setOrderReference({
              id: restoredOrder.id,
              os_number: restoredOrder.os_number,
            });
            setAnswers(
              normalizeQuestionnaireAnswers(restoredOrder.questionnaire),
            );
            setCurrentStep(restoredOrder.current_step);

            if (!previewAuthPending) {
              clearQuestionnaireDraft();
              saveQuestionnaireStep(1);
            }

            if (restoredOrder.state === "GERANDO_MUSICA_1") {

              setQuestionnaireState("GERANDO_MUSICA");
              return;
            }

                                    if (order.state === "MUSICA_1_PREVIEW") {
              const { data: previewData } = await supabase
                .from("orders")
                .select("preview_play_count")
                .eq("id", order.id)
                .eq("user_id", user.id)
                .maybeSingle();

              setPreviewPlayCount(
                previewData?.preview_play_count ?? 0,
              );

              savePreviewAuthPending(false);
              setQuestionnaireState("PREVIEW_PAGAMENTO");
              return;
            }

                                    if (order.state === "AGUARDANDO_PAGAMENTO") {
              savePreviewAuthPending(false);
              setPaymentStarted(true);
              setQuestionnaireState("PAGAMENTO");
              return;
            }

             setQuestionnaireState("EDITAVEL");
            return;
          }
        }

                const shouldRestoreDraft = !user || previewAuthPending;

        const savedAnswers = normalizeQuestionnaireAnswers(
          shouldRestoreDraft
            ? loadQuestionnaireDraft()
            : questionnaireDefaults,
        );

        const savedStep = previewAuthPending
          ? QUESTIONNAIRE_TOTAL_STEPS
          : shouldRestoreDraft
            ? loadQuestionnaireStep()
            : 1;

                if (user) {
          const order = await createUserOrder(savedAnswers);
          setOrderReference({ id: order.id, os_number: order.os_number });

          if (!order.wasCreated) {
            await loadInitialData();
            return;
          }

                    if (savedStep !== 1) {
            await updateUserOrderDraft(
              order.id,
              savedAnswers,
              savedStep,
            );
          }

          clearQuestionnaireDraft();
          saveQuestionnaireStep(1);
          savePreviewAuthPending(false);
        }

        setAnswers(savedAnswers);
        setCurrentStep(savedStep);
        setPreviewPlayCount(0);
        setQuestionnaireState("EDITAVEL");
      }

      loadInitialData();
    }, 0);

            return () => window.clearTimeout(timer);
  }, []);

useEffect(() => {
  if (
    questionnaireState !== "EDITAVEL" ||
    orderReference !== null
  ) {
    return;
  }

  saveQuestionnaireDraft(answers);
  saveQuestionnaireStep(currentStep);
}, [answers, currentStep, questionnaireState, orderReference]);

  useEffect(() => {
    if (
      questionnaireState !== "GERANDO_MUSICA" ||
      !orderReference?.id
    ) {
      return;
    }

    const orderId = orderReference.id;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function checkGeneration() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (userError || !user) {
          setGenerationMessage(
            "Não foi possível confirmar sua sessão. Entre novamente para acompanhar sua música.",
          );
          return;
        }

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (cancelled) return;

        if (sessionError || !session) {
          setGenerationMessage(
            "Entre novamente para acompanhar sua música.",
          );
          return;
        }

        const response = await fetch(
          `/api/music/status?orderId=${encodeURIComponent(orderId)}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            cache: "no-store",
            signal: AbortSignal.timeout(180000),
          },
        );

        if (cancelled) return;

        if (response.status === 401 || response.status === 404) {
          setGenerationMessage(
            "Não foi possível acessar esta solicitação. Entre novamente e consulte Minhas músicas.",
          );
          return;
        }

        if (!response.ok) {
          throw new Error("Não foi possível consultar a geração.");
        }

        const order = await response.json();

        if (cancelled) return;

        if (!order || typeof order.state !== "string") {
          throw new Error("Resposta da geração inválida.");
        }

        setGenerationMessage(
          typeof order.message === "string" ? order.message : null,
        );

        if (order.continuePolling === false) {
          return;
        }

        if (order.state === "MUSICA_1_PREVIEW") {
          setPreviewPlayCount(order.preview_play_count ?? 0);
          setQuestionnaireState("PREVIEW_PAGAMENTO");
          return;
        }

        if (order.state === "AGUARDANDO_PAGAMENTO") {
          setPaymentStarted(true);
          setQuestionnaireState("PAGAMENTO");
          return;
        }

        if (
          order.state === "MUSICA_1_DISPONIVEL" &&
          order.payment_status === "APPROVED"
        ) {
          setQuestionnaireState("PAGAMENTO_CONFIRMADO");
          return;
        }

        if (order.state !== "GERANDO_MUSICA_1") {
          setGenerationMessage(
            "A geração foi interrompida. Acesse Minhas músicas para consultar sua solicitação.",
          );
          return;
        }
      } catch {
        if (cancelled) return;

        setGenerationMessage(
          "Não foi possível atualizar o andamento agora. Tentaremos novamente automaticamente.",
        );
      }

      if (!cancelled) {
        timer = setTimeout(checkGeneration, 5000);
      }
    }

    timer = setTimeout(checkGeneration, 0);

    return () => {
      cancelled = true;

      if (timer !== undefined) {
        clearTimeout(timer);
      }
    };
  }, [questionnaireState, orderReference?.id]);

  const currentStepData =
    currentStep === 3
      ? getStepThreeContent(answers)
      : currentStep === 4
        ? getStepFourContent(answers)
        : questionnaireSteps.find(
            (item) => item.step === currentStep,
          );

  function handleChange(
    field: keyof QuestionnaireAnswers,
    value: string,
    confirmed = false,
  ) {
    if (answers[field] === value) {
      return;
    }

    if (field === "destinatario") {
      const affectedFields: Array<keyof QuestionnaireAnswers> = [
        "destinatarioOutro",
        "tempoRelacionamento",
        "formaTratamento",
        "historiaRelacao",
        "motivoEspecial",
        "idadeHomenageado",
        "tipoComemoracao",
        "tempoComemoracao",
        "incluirPedidoCasamento",
        "intencaoHomenagem",
        "qualidades",
        "memoriaMarcante",
        "mensagemFinal",
      ];

      const clearsOccasion =
        answers.ocasiao !== "" &&
        !isOccasionAllowed(value, answers.ocasiao);

      if (clearsOccasion) {
        affectedFields.push("ocasiao", "ocasiaoOutra");
      }

      const hasAffectedAnswers = affectedFields.some(
        (key) => answers[key].trim() !== "",
      );

      const confirmationMessage = clearsOccasion
        ? "Trocar quem recebe a homenagem limpará a ocasião incompatível, a descrição de Outra ocasião, as respostas das etapas 3 a 6 e a descrição de Outro. Os nomes serão mantidos para você revisar. Deseja continuar?"
        : "Trocar quem recebe a homenagem limpará as respostas das etapas 3 a 6 e a descrição de Outro. Os nomes e a ocasião compatível serão mantidos para você revisar. Deseja continuar?";

      if (hasAffectedAnswers && !confirmed) {
        setPendingChange({
          field,
          value,
          message: confirmationMessage,
        });
        return;
      }

      setAnswers((currentAnswers) => {
        const nextAnswers = {
          ...currentAnswers,
          destinatario: value,
        };

        for (const key of affectedFields) {
          nextAnswers[key] = "";
        }

        return normalizeQuestionnaireAnswers(nextAnswers);
      });

      return;
    }

    if (field === "ocasiao") {
      const affectedFields: Array<keyof QuestionnaireAnswers> = [
        "ocasiaoOutra",
        "motivoEspecial",
        "idadeHomenageado",
        "tipoComemoracao",
        "tempoComemoracao",
        "incluirPedidoCasamento",
        "intencaoHomenagem",
      ];

      const hasAffectedAnswers = affectedFields.some(
        (key) => answers[key].trim() !== "",
      );

      if (hasAffectedAnswers && !confirmed) {
        setPendingChange({
          field,
          value,
          message:
            "Trocar a ocasião limpará as respostas da etapa 4 e a descrição de Outra ocasião. As demais respostas serão mantidas para você revisar. Deseja continuar?",
        });
        return;
      }

      setAnswers((currentAnswers) => {
        const nextAnswers = {
          ...currentAnswers,
          ocasiao: value,
        };

        for (const key of affectedFields) {
          nextAnswers[key] = "";
        }

        return normalizeQuestionnaireAnswers(nextAnswers);
      });

      return;
    }

    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [field]: value,
    }));
  }

  async function handleBack() {
  if (currentStep <= 1) {
    return;
  }

  const previousStep = currentStep - 1;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const order = await getCurrentUserOrder();

    if (order) {
      await updateUserOrderDraft(
        order.id,
        answers,
        previousStep,
      );
    }
  }

  setCurrentStep(previousStep);
}

  async function handleNext() {
    const validationError = validateQuestionnaire(answers, currentStep);

    if (validationError) {
      setCurrentStep(validationError.step);
      setValidationMessage(validationError.message);
      return;
    }

    if (currentStep < QUESTIONNAIRE_TOTAL_STEPS) {
      const nextStep = currentStep + 1;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        let order = await getCurrentUserOrder();

               if (!order) {
          const createdOrder = await createUserOrder(answers);

          if (!createdOrder.wasCreated) {
            window.location.reload();
            return;
          }

          order = createdOrder;
        }

        setOrderReference({ id: order.id, os_number: order.os_number });

        if (order.state === "GERANDO_MUSICA_1") {
          setQuestionnaireState("GERANDO_MUSICA");
          return;
        }

        if (order.state === "MUSICA_1_PREVIEW") {
          savePreviewAuthPending(false);
          setQuestionnaireState("PREVIEW_PAGAMENTO");
          return;
        }

        if (order.state !== "QUESTIONÁRIO_ABERTO") {
          return;
        }

        await updateUserOrderDraft(
          order.id,
          answers,
          nextStep,
        );
      }

      setCurrentStep(nextStep);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    savePreviewAuthPending(true);

    if (!user) {
      setQuestionnaireState("AGUARDANDO_LOGIN_PREVIEW");
      return;
    }

    let order = await getCurrentUserOrder();

        if (!order) {
      const createdOrder = await createUserOrder(answers);

      if (!createdOrder.wasCreated) {
        window.location.reload();
        return;
      }

      order = createdOrder;

      await updateUserOrderDraft(
        order.id,
        answers,
        QUESTIONNAIRE_TOTAL_STEPS,
      );
    }

    setOrderReference({ id: order.id, os_number: order.os_number });

    if (order.state === "GERANDO_MUSICA_1") {
      savePreviewAuthPending(false);
      setQuestionnaireState("GERANDO_MUSICA");
      return;
    }

    if (order.state === "MUSICA_1_PREVIEW") {
      savePreviewAuthPending(false);
      setQuestionnaireState("PREVIEW_PAGAMENTO");
      return;
    }

    if (order.state !== "QUESTIONÁRIO_ABERTO") {
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setQuestionnaireState("AGUARDANDO_LOGIN_PREVIEW");
      return;
    }

    const response = await fetch("/api/music/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        orderId: order.id,
        questionnaire: answers,
      }),
    });

    if (!response.ok) {
      const errorResult = await response.json().catch(() => null);

      if (
        response.status === 400 &&
        errorResult &&
        Number.isInteger(errorResult.step) &&
        errorResult.step >= 1 &&
        errorResult.step <= 7 &&
        typeof errorResult.error === "string"
      ) {
        savePreviewAuthPending(false);
        setCurrentStep(errorResult.step);
        setValidationMessage(errorResult.error);
        return;
      }

      throw new Error(
        "Não foi possível iniciar a geração da música.",
      );
    }

    const result = await response.json();

    savePreviewAuthPending(false);

    if (result.state === "MUSICA_1_PREVIEW") {
      setQuestionnaireState("PREVIEW_PAGAMENTO");
      return;
    }

        setQuestionnaireState("GERANDO_MUSICA");
  }

  async function handlePreviewPlay() {
    if (previewRequestRef.current || previewPlaying) {
      return;
    }

    const audio = previewAudioRef.current;

    if (!audio) {
      setPreviewMessage("O player não está disponível. Atualize a página.");
      return;
    }

    previewRequestRef.current = true;
    setPreviewBusy(true);
    setPreviewMessage(null);

    try {
      if (previewCanResume) {
        await audio.play();
        setPreviewCanResume(false);
        return;
      }

      if (previewPlayCount >= 5) {
        setPreviewMessage("O limite de reproduções foi atingido.");
        return;
      }

      if (!orderReference?.id) {
        throw new Error("Pedido não encontrado. Atualize a página.");
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error("Entre novamente para ouvir seu preview.");
      }

      const response = await fetch("/api/music/preview/play", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          orderId: orderReference.id,
        }),
        cache: "no-store",
      });

      const result = await response.json();

      if (typeof result.previewPlayCount === "number") {
        setPreviewPlayCount(result.previewPlayCount);
      }

      if (!response.ok) {
        throw new Error(
          result.error ?? "Não foi possível iniciar o preview.",
        );
      }

      if (result.simulated === true) {
        setPreviewMessage(
          "Reprodução simulada: este pedido não possui áudio real.",
        );
        return;
      }

      if (
        typeof result.previewUrl !== "string" ||
        !result.previewUrl
      ) {
        throw new Error("O servidor não disponibilizou o áudio do preview.");
      }

      audio.src = result.previewUrl;
      audio.load();

      setPreviewCanResume(true);
      await audio.play();
      setPreviewCanResume(false);
    } catch (error) {
      setPreviewMessage(
        error instanceof Error && error.name === "NotAllowedError"
          ? "Clique em Continuar preview para permitir a reprodução."
          : error instanceof Error
            ? error.message
            : "Não foi possível reproduzir o preview.",
      );
    } finally {
      previewRequestRef.current = false;
      setPreviewBusy(false);
    }
  }

  function renderCurrentStep() {
  switch (currentStep) {
    case 1:
      return (
        <StepOne
          answers={answers}
          onChange={handleChange}
        />
      );

    case 2:
      return (
        <StepTwo
          answers={answers}
          onChange={handleChange}
        />
      );

    case 3:
      return (
        <StepThree
          answers={answers}
          onChange={handleChange}
        />
      );

    case 4:
      return (
        <StepFour
          answers={answers}
          onChange={handleChange}
        />
      );

    case 5:
      return (
        <StepFive
          answers={answers}
          onChange={handleChange}
        />
      );

    case 6:
      return (
        <StepSix
          answers={answers}
          onChange={handleChange}
        />
      );

    case 7:
      return (
        <StepSeven
          answers={answers}
          onChange={handleChange}
        />
      );

    default:
      return null;
  }
}

if (questionnaireState === "CARREGANDO") {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <h1>Carregando...</h1>

        <p>
          Verificando o estado da sua música.
        </p>
      </div>
    </main>
  );
}

if (questionnaireState === "AGUARDANDO_LOGIN_PREVIEW") {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <h1>Quer visualizar o preview?</h1>

        <p>
          Faça um rápido cadastro para liberar.
          Seu progresso não será perdido.
        </p>

        <a href="/cadastro">
          Criar conta
        </a>

        <a href="/entrar">
          Já tenho uma conta
        </a>
      </div>
    </main>
  );
}

if (questionnaireState === "GERANDO_MUSICA") {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {orderSummary}
        <GeneratingMusic />

        {generationMessage && (
          <p role="status" aria-live="polite">
            {generationMessage}{" "}
            <a href="/minhas-musicas">Ir para Minhas músicas</a>
          </p>
        )}
      </div>
    </main>
  );
}

if (questionnaireState === "PREVIEW_PAGAMENTO") {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.previewTitle}>
  Seu preview está pronto
</h1>
        {orderSummary}

        <h2 className={styles.previewMusicTitle}>
  {getMusicTitle(answers)}
</h2>

        <p>
          Seu pedido está salvo.
          <br />
          Aproveite agora.
        </p>

        <p>
          Ouça uma prévia de 35 segundos da música que você criou.
        </p>

        <audio
          ref={previewAudioRef}
          preload="none"
          onPlaying={() => {
            setPreviewPlaying(true);
            setPreviewCanResume(false);
            setPreviewMessage(null);
          }}
          onPause={() => setPreviewPlaying(false)}
          onEnded={() => {
            setPreviewPlaying(false);
            setPreviewCanResume(false);
          }}
          onError={() => {
            setPreviewPlaying(false);
            setPreviewMessage(
              "Não foi possível carregar o áudio. Verifique sua conexão.",
            );
          }}
        />

        <p>
          Reproduções do preview: {previewPlayCount}/5
        </p>

        <button
          type="button"
          className={styles.previewPlayButton}
          onClick={handlePreviewPlay}
          disabled={
            previewBusy ||
            previewPlaying ||
            (previewPlayCount >= 5 && !previewCanResume)
          }
        >
          {previewBusy
            ? "Carregando preview..."
            : previewPlaying
              ? "Reproduzindo preview..."
              : previewCanResume
                ? "Continuar preview"
                : previewPlayCount >= 5
                  ? "Limite de reproduções atingido"
                  : "▶ Ouvir preview"}
        </button>

        {previewMessage && (
          <p role="status" aria-live="polite">
            {previewMessage}
          </p>
        )}

        <h2 className={styles.previewQuestionTitle}>
          Gostou da sua música?
        </h2>

        <p>
          <strong>A música completa está esperando por você!</strong>
          <br />
          Finalize o pagamento e libere a música inteira, a letra e as
          opções de compartilhamento.
        </p>

        <button
          type="button"
          className={styles.previewPaymentButton}
          onClick={() => {
            setPaymentError(null);
            setQuestionnaireState("PAGAMENTO");
          }}
        >
          Ir para pagamento
        </button>
      </div>
    </main>
  );
}

if (questionnaireState === "PAGAMENTO") {
  return (
    <main className={`${styles.page} ${styles.paymentPage}`}>
      <div className={styles.container}>
        <h1>Pagamento</h1>
        {orderSummary}

        <section>
          <h2>{getMusicTitle(answers)}</h2>

          <p>
            Música personalizada completa e letra incluída.
          </p>

          <p>
            <strong>R$ 39,90</strong>
          </p>
        </section>

        <section className={styles.streamingSection}>
          <fieldset className={styles.streamingFieldset}>
            <legend>
              Publicar nas plataformas de streaming?
            </legend>

            <label className={styles.streamingOptionDisabled}>
              <input
                type="radio"
                name="streamingPublication"
                value="yes"
                disabled
              />
              <span>Sim — Em breve</span>
            </label>

            <p className={styles.streamingAdditional}>
              Adicional de R$ 19,90
            </p>

            <label className={styles.streamingOption}>
              <input
                type="radio"
                name="streamingPublication"
                value="no"
                defaultChecked
              />
              <span>Não</span>
            </label>
          </fieldset>

          <p className={styles.streamingNotice}>
            A publicação nas plataformas de streaming ainda não está
            disponível e não será adicionada ao pagamento atual.
          </p>
        </section>

        <section className={styles.checkoutCard}>
          <h2>Resumo do pedido</h2>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <span>Música personalizada</span>
            <strong>R$ 39,90</strong>
          </div>

          <hr />

          <button
            type="button"
            className={styles.couponToggle}
            aria-expanded={couponEnabled}
            aria-controls="checkout-coupon-content"
            disabled={paymentStarted || startingPayment}
            onClick={() => {
              setCouponEnabled(!couponEnabled);
              setCouponCode("");
              setCouponError(null);
              setAppliedCoupon(null);
            }}
          >
            <span className={styles.couponToggleLabel}>
              <span className={styles.couponSymbol}>%</span>
              Tenho um cupom de desconto
            </span>
            <span className={styles.couponToggleArrow} aria-hidden="true">
              {couponEnabled ? "−" : "+"}
            </span>
          </button>

          {couponEnabled && (
            <div
              id="checkout-coupon-content"
              className={styles.couponPanel}
            >
              <div className={styles.couponInputRow}>
                <input
                  type="text"
                  value={couponCode}
                  maxLength={40}
                  autoComplete="off"
                  placeholder="Digite ou cole seu cupom"
                  aria-label="Código do cupom"
                  disabled={
                    couponValidating ||
                    paymentStarted ||
                    startingPayment
                  }
                  onChange={(event) => {
                    setCouponCode(
                      event.target.value.toUpperCase(),
                    );
                    setCouponError(null);
                    setAppliedCoupon(null);
                  }}
                  className={styles.couponInput}
                />

                <button
                  type="button"
                  className={styles.checkoutButtonPrimary}
                  disabled={
                    !couponCode.trim() ||
                    couponValidating ||
                    paymentStarted ||
                    startingPayment
                  }
                  onClick={async () => {
                    if (
                      !couponCode.trim() ||
                      couponValidating ||
                      !orderReference
                    ) {
                      return;
                    }

                    setCouponValidating(true);
                    setCouponError(null);
                    setAppliedCoupon(null);

                    try {
                      const {
                        data: { session },
                        error: sessionError,
                      } = await supabase.auth.getSession();

                      if (sessionError || !session) {
                        throw new Error(
                          "Entre novamente na sua conta.",
                        );
                      }

                      const response = await fetch(
                        "/api/coupons/validate",
                        {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization:
                              `Bearer ${session.access_token}`,
                          },
                          body: JSON.stringify({
                            orderId: orderReference.id,
                            couponCode:
                              couponCode.trim().toUpperCase(),
                          }),
                        },
                      );

                      const result = await response.json();

                      if (
                        !response.ok ||
                        !result.success ||
                        !result.valid
                      ) {
                        throw new Error(
                          response.status === 429
                            ? "Muitas tentativas. Tente novamente mais tarde."
                            : response.status >= 500
                              ? "Não foi possível validar o cupom. Tente novamente."
                              : "Cupom inválido.",
                        );
                      }

                      const pricing = result.pricing;
                      const coupon = result.coupon;

                      const percentualValido =
                        coupon?.discountType === "PERCENT" &&
                        Number.isInteger(coupon?.discountPercent) &&
                        coupon.discountPercent >= 1 &&
                        coupon.discountPercent <= 100 &&
                        coupon.discountFixedCents == null;

                      const fixoValido =
                        coupon?.discountType === "FIXED" &&
                        Number.isInteger(coupon?.discountFixedCents) &&
                        coupon.discountFixedCents <= 3990 &&
                        coupon.discountPercent == null;

                      const descontoEsperado = percentualValido
                        ? Math.floor(
                            (3990 * coupon.discountPercent + 50) / 100,
                          )
                        : fixoValido
                          ? coupon.discountFixedCents
                          : null;

                      if (
                        typeof coupon?.code !== "string" ||
                        !/^[A-Z0-9_-]{4,40}$/.test(coupon.code) ||
                        (!percentualValido && !fixoValido) ||
                        !Number.isInteger(pricing?.originalAmountCents) ||
                        !Number.isInteger(pricing?.discountAmountCents) ||
                        !Number.isInteger(pricing?.totalAmountCents) ||
                        pricing.originalAmountCents !== 3990 ||
                        descontoEsperado === null ||
                        pricing.discountAmountCents !== descontoEsperado ||
                        pricing.totalAmountCents !==
                          3990 - descontoEsperado
                      ) {
                        throw new Error(
                          "Resposta inválida ao validar o cupom.",
                        );
                      }

                      setAppliedCoupon({
                        code: coupon.code,
                        discountType: coupon.discountType,
                        discountPercent: percentualValido
                          ? coupon.discountPercent
                          : null,
                        discountFixedCents: fixoValido
                          ? coupon.discountFixedCents
                          : null,
                        originalAmountCents:
                          pricing.originalAmountCents,
                        discountAmountCents:
                          pricing.discountAmountCents,
                        totalAmountCents:
                          pricing.totalAmountCents,
                      });
                    } catch (error) {
                      setCouponError(
                        error instanceof Error
                          ? error.message
                          : "Cupom inválido.",
                      );
                    } finally {
                      setCouponValidating(false);
                    }
                  }}
                >
                  {couponValidating
                    ? "Validando..."
                    : "Aplicar"}
                </button>
              </div>

              {couponError && (
                <p
                  role="alert"
                  style={{
                    color: "#b42318",
                    marginTop: 10,
                  }}
                >
                  {couponError}
                </p>
              )}

              {appliedCoupon && (
                <div className={styles.couponSuccess}>
                  <p
                    role="status"
                    className={styles.couponSuccessText}
                  >
                    Cupom aplicado:{" "}
                    {appliedCoupon.discountType === "PERCENT"
                      ? `${appliedCoupon.discountPercent}% de desconto`
                      : `R$ ${(appliedCoupon.discountAmountCents / 100)
                          .toFixed(2)
                          .replace(".", ",")} de desconto`}
                  </p>

                  <button
                    type="button"
                    className={styles.couponRemove}
                    disabled={paymentStarted || startingPayment}
                    onClick={() => {
                      setCouponCode("");
                      setCouponError(null);
                      setAppliedCoupon(null);
                    }}
                  >
                    Remover cupom
                  </button>
                </div>
              )}
            </div>
          )}

          <hr />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 16,
              gap: 12,
            }}
          >
            <span>Preço original</span>
            <span>R$ 39,90</span>
          </div>

          {appliedCoupon && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                marginTop: 12,
              }}
            >
              <span>
                {appliedCoupon.discountType === "PERCENT"
                  ? `Desconto (${appliedCoupon.discountPercent}%)`
                  : "Desconto (valor fixo)"}
              </span>

              <span style={{ color: "#237a37" }}>
                − R${" "}
                {(
                  appliedCoupon.discountAmountCents / 100
                ).toFixed(2).replace(".", ",")}
              </span>
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              marginTop: 20,
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            <span>Total a pagar</span>

            <strong>
              R${" "}
              {(
                (appliedCoupon?.totalAmountCents ?? 3990) /
                100
              ).toFixed(2).replace(".", ",")}
            </strong>
          </div>

          {appliedCoupon && (
            <p style={{ fontSize: 12, marginTop: 12 }}>
              O desconto será revalidado ao iniciar
              o pagamento.
            </p>
          )}
        </section>




        {paymentError && (
          <p role="alert">{paymentError}</p>
        )}

        {(
          <button
            type="button"
            className={styles.checkoutPayButton}
            disabled={startingPayment}
            onClick={async () => {
              if (startingPayment) {
                return;
              }

              setStartingPayment(true);
              setPaymentError(null);

              try {
                if (!orderReference) {
                  throw new Error(
                    "Solicitação não encontrada. Atualize a página.",
                  );
                }

                const {
                  data: { session },
                  error: sessionError,
                } = await supabase.auth.getSession();

                if (sessionError || !session) {
                  throw new Error(
                    "Entre novamente na sua conta para continuar.",
                  );
                }

                const response = await fetch("/api/payment/start", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                  },
                  body: JSON.stringify({
                    orderId: orderReference.id,
                    couponCode: appliedCoupon?.code ?? "",
                  }),
                });

                const result = await response.json();

                if (!response.ok || !result.success) {
                  throw new Error(
                    typeof result.error === "string"
                      ? result.error
                      : "Não foi possível iniciar o pagamento. Tente novamente.",
                  );
                }

                // Cupom de 100%:
                // o servidor conclui o pedido gratuitamente.
                if (
                  result.paymentMode === "coupon" &&
                  result.state === "MUSICA_1_DISPONIVEL" &&
                  result.paymentStatus === "APPROVED"
                ) {
                  setPaymentStarted(false);
                  setQuestionnaireState("PAGAMENTO_CONFIRMADO");
                  return;
                }

                // Fluxo de pagamento real Mercado Pago:
                // só redireciona quando esse modo estiver ativo.
                if (
                  (result.paymentMode === "mercadopago_test" ||
                    result.paymentMode === "mercadopago_prod") &&
                  typeof result.checkoutUrl === "string" &&
                  result.checkoutUrl.startsWith("https://")
                ) {
                  window.location.assign(result.checkoutUrl);
                  return;
                }

                throw new Error(
                  "Resposta inesperada ao iniciar o pagamento.",
                );

              } catch (error) {
                setPaymentError(
                  error instanceof Error
                    ? error.message
                    : "Não foi possível iniciar o pagamento.",
                );
              } finally {
                setStartingPayment(false);
              }
            }}
          >
            {startingPayment ? "Registrando pedido…" : "Pagar"}
          </button>
        )}



      </div>
    </main>
  );
}

if (questionnaireState === "PAGAMENTO_CONFIRMADO") {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <h1>Pagamento aprovado</h1>
        {orderSummary}

        <p>
          Seu pagamento foi confirmado com sucesso.
        </p>

        <p>
          Confira sua música em{" "}
          <a
            href="/minhas-musicas"
            style={{
              color: "inherit",
              fontWeight: 600,
              textDecoration: "underline",
              textUnderlineOffset: "3px",
            }}
          >
            Minhas músicas
          </a>
          .
        </p>
      </div>
    </main>
  );
}

return (
    <main className={`${styles.page} ${styles.questionnairePage}`}>
      <div className={styles.container}>
        <QuestionnaireProgress
          currentStep={currentStep}
          totalSteps={QUESTIONNAIRE_TOTAL_STEPS}
        >
          <QuestionnaireNavigation
            currentStep={currentStep}
            totalSteps={QUESTIONNAIRE_TOTAL_STEPS}
            onBack={handleBack}
            onNext={handleNext}
          />
        </QuestionnaireProgress>

        {orderSummary}


        <section className={styles.question}>
          <h1>{currentStepData?.title}</h1>
          <p>{currentStepData?.subtitle}</p>

          {currentStep === 8 && (
            <div
              style={{
                margin: "28px auto 0",
                padding: "18px 24px",
                maxWidth: 540,
                border: "1px solid #e3bd79",
                borderRadius: 12,
                background: "#fffaf2",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  margin: "0 0 8px",
                  fontSize: 14,
                  fontWeight: 400,
                  color: "#79532f",
                }}
              >
                Nome da sua música
              </p>

              <h2
                style={{
                  margin: 0,
                  fontSize: 24,
                  lineHeight: 1.3,
                  color: "#2b1b13",
                  overflowWrap: "anywhere",
                }}
              >
                {getMusicTitle(answers)}
              </h2>
            </div>
          )}
        </section>


        <section
          className={
            currentStep >= 3 && currentStep <= 7
              ? styles.remainingSteps
              : undefined
          }
        >
          {renderCurrentStep()}
        </section>
      </div>

      <dialog
        ref={validationRef}
        className={styles.confirmationDialog}
        aria-labelledby="validation-title"
        aria-describedby="validation-description"
        onCancel={() => setValidationMessage(null)}
      >
        <h2 id="validation-title">Falta uma resposta</h2>

        <p id="validation-description">{validationMessage}</p>

        <div className={styles.confirmationActions}>
          <button
            type="button"
            className={styles.confirmationAccept}
            autoFocus
            onClick={() => setValidationMessage(null)}
          >
            Continuar preenchendo
          </button>
        </div>
      </dialog>

      <dialog
        ref={confirmationRef}
        className={styles.confirmationDialog}
        aria-labelledby="confirmation-title"
        aria-describedby="confirmation-description"
        onCancel={() => setPendingChange(null)}
      >
        {pendingChange && (
          <>
            <h2 id="confirmation-title">
              {pendingChange.field === "destinatario"
                ? "Alterar o homenageado?"
                : "Alterar a ocasião?"}
            </h2>

            <p id="confirmation-description">
              {pendingChange.message}
            </p>

            <div className={styles.confirmationActions}>
              <button
                type="button"
                className={styles.confirmationCancel}
                autoFocus
                onClick={() => setPendingChange(null)}
              >
                Manter como está
              </button>

              <button
                type="button"
                className={styles.confirmationAccept}
                onClick={() => {
                  handleChange(
                    pendingChange.field,
                    pendingChange.value,
                    true,
                  );
                  setPendingChange(null);
                }}
              >
                Confirmar alteração
              </button>
            </div>
          </>
        )}
      </dialog>
    </main>
  );
}