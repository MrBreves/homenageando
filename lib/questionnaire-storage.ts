import type { QuestionnaireAnswers } from "@/types/questionnaire";

const STORAGE_KEY = "homenageando_questionnaire";

export function saveQuestionnaireDraft(
  answers: QuestionnaireAnswers,
): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
}

export function loadQuestionnaireDraft(): QuestionnaireAnswers | null {
  if (typeof window === "undefined") {
    return null;
  }

  const savedDraft = localStorage.getItem(STORAGE_KEY);

  if (!savedDraft) {
    return null;
  }

  try {
    return JSON.parse(savedDraft) as QuestionnaireAnswers;
  } catch {
    return null;
  }
}

export function clearQuestionnaireDraft(): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
}

const STEP_STORAGE_KEY = "homenageando_questionnaire_step";

export function saveQuestionnaireStep(step: number): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(STEP_STORAGE_KEY, String(step));
}

export function loadQuestionnaireStep(): number {
  if (typeof window === "undefined") {
    return 1;
  }

  const savedStep = Number(localStorage.getItem(STEP_STORAGE_KEY));

  if (!Number.isInteger(savedStep) || savedStep < 1 || savedStep > 8) {
    return 1;
  }

  return savedStep;
}

const PREVIEW_AUTH_STORAGE_KEY = "homenageando_preview_auth_pending";

export function savePreviewAuthPending(pending: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  if (pending) {
    localStorage.setItem(PREVIEW_AUTH_STORAGE_KEY, "true");
    return;
  }

  localStorage.removeItem(PREVIEW_AUTH_STORAGE_KEY);
}

export function loadPreviewAuthPending(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return localStorage.getItem(PREVIEW_AUTH_STORAGE_KEY) === "true";
}