
import type { QuestionnaireAnswers } from "@/types/questionnaire";

type MusicTitleAnswers =
  Partial<QuestionnaireAnswers> | null | undefined;

export function getMusicTitle(
  answers: MusicTitleAnswers,
): string {
  if (!answers) {
    return "Homenagem especial";
  }

  const customTitle =
    answers.tituloMusica?.trim() ?? "";

  const automatic =
    answers.gerarTituloAutomaticamente === "Sim";

  if (!automatic && customTitle) {
    return customTitle;
  }

  // Compatibilidade com questionários antigos.
  if (!automatic && !customTitle) {
    const recipient = answers.nomeHomenageado?.trim();

    return recipient
      ? `Homenagem para ${recipient}`
      : "Homenagem especial";
  }

  let occasion = answers.ocasiao?.trim() ?? "";

  if (occasion === "Outra ocasião") {
    occasion =
      answers.ocasiaoOutra?.trim() || "Homenagem especial";
  }

  if (
    occasion === "Aniversário de namoro / casamento" &&
    answers.tipoComemoracao
  ) {
    occasion = `Aniversário de ${answers.tipoComemoracao.toLowerCase()}`;
  }

  if (!occasion || occasion === "Só porque sim") {
    occasion = "Uma homenagem especial";
  }

  const recipient =
    answers.nomeHomenageado?.trim() ?? "";

  return recipient
    ? `${occasion} — ${recipient}`
    : occasion;
}

export function getMusicFileName(
  title: string,
): string {
  const normalized = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 80);

  return normalized || "homenagem-especial";
}
