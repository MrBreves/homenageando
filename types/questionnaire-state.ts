export type QuestionnaireState =
  | "EDITAVEL"
  | "BLOQUEANDO"
  | "GERANDO_MUSICA";

export function isQuestionnaireEditable(
  state: QuestionnaireState,
): boolean {
  return state === "EDITAVEL";
}