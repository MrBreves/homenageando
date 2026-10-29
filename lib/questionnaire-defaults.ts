import type { QuestionnaireAnswers } from "@/types/questionnaire";

export const questionnaireDefaults: QuestionnaireAnswers = {
  destinatario: "",
  destinatarioOutro: "",

  ocasiao: "",
  ocasiaoOutra: "",

  nomeUsuario: "",
  nomeHomenageado: "",

  tempoRelacionamento: "",
  formaTratamento: "",
  historiaRelacao: "",

  motivoEspecial: "",
  idadeHomenageado: "",
  tipoComemoracao: "",
  tempoComemoracao: "",
  incluirPedidoCasamento: "",
  intencaoHomenagem: "",

  qualidades: "",
  memoriaMarcante: "",

  mensagemFinal: "",

  estiloMusical: "",
  tomEmocional: "",
  vozCantor: "",

  tituloMusica: "",
  gerarTituloAutomaticamente: "Não",
};
export function normalizeQuestionnaireAnswers(
  input: unknown,
): QuestionnaireAnswers {
  const normalized: QuestionnaireAnswers = {
    ...questionnaireDefaults,
  };

  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input)
  ) {
    return normalized;
  }

  const source = input as Record<string, unknown>;

  for (
    const field of Object.keys(
      questionnaireDefaults,
    ) as Array<keyof QuestionnaireAnswers>
  ) {
    const value = source[field];

    if (typeof value === "string") {
      normalized[field] = value;
    }
  }

  if (normalized.destinatario !== "Outro") {
    normalized.destinatarioOutro = "";
  }

  if (normalized.ocasiao !== "Outra ocasião") {
    normalized.ocasiaoOutra = "";
  }

  if (normalized.ocasiao !== "Aniversário") {
    normalized.idadeHomenageado = "";
  }

  if (
    normalized.ocasiao !==
    "Aniversário de namoro / casamento"
  ) {
    normalized.tipoComemoracao = "";
    normalized.tempoComemoracao = "";
  }

  if (normalized.ocasiao !== "Pedido de casamento") {
    normalized.incluirPedidoCasamento = "";
  }

  if (
    normalized.ocasiao !==
    "Reconquista / Pedido de desculpas"
  ) {
    normalized.intencaoHomenagem = "";
  }

  const familiares = [
    "Meu pai",
    "Minha mãe",
    "Meu filho",
    "Minha filha",
    "Meu irmão",
    "Minha irmã",
    "Meu avô",
    "Minha avó",
  ];

  if (!familiares.includes(normalized.destinatario)) {
    normalized.formaTratamento = "";
  }

  return normalized;
}