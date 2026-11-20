import { isOccasionAllowed } from "@/data/questionnaire-steps";
import { normalizeQuestionnaireAnswers, questionnaireDefaults } from "@/lib/questionnaire-defaults";
import type { QuestionnaireAnswers } from "@/types/questionnaire";

// Dados fictícios. Esta função não lê nem grava pedidos ou rascunhos.
export function createQuestionnaireExample(): QuestionnaireAnswers {
  return {
    ...questionnaireDefaults,
    destinatario: "Minha namorada / esposa / noiva",
    nomeUsuario: "Lucas",
    nomeHomenageado: "Marina",
    ocasiao: "Aniversário de namoro / casamento",
    tempoRelacionamento: "Estamos juntos há 10 anos.",
    historiaRelacao: "Nos conhecemos em um encontro de amigos. Desde então, construímos uma vida cheia de parceria, carinho e pequenas aventuras.",
    motivoEspecial: "Quero celebrar nossos dez anos de casamento e agradecer por cada sonho que realizamos juntos.",
    tipoComemoracao: "Casamento",
    tempoComemoracao: "10 anos",
    qualidades: "Carinhosa, companheira, bem-humorada e sempre pronta para apoiar quem ama.",
    memoriaMarcante: "Nossa primeira viagem à praia, quando ficamos conversando até o sol nascer.",
    mensagemFinal: "Marina, escolher você continua sendo a melhor decisão da minha vida. Que venham muitos outros capítulos da nossa história.",
    estiloMusical: "Pop Romântico",
    tomEmocional: "Romântico",
    vozCantor: "Masculina",
    tituloMusica: "Nossa história continua",
  };
}

export function updateDemoAnswer(
  current: QuestionnaireAnswers,
  field: keyof QuestionnaireAnswers,
  value: string,
): QuestionnaireAnswers {
  if (current[field] === value) return current;
  const next = { ...current, [field]: value };

  // Mantém as dependências das perguntas, dispensando confirmações e validações
  // somente neste formulário temporário. O fluxo real permanece independente.
  if (field === "destinatario") {
    const fields: Array<keyof QuestionnaireAnswers> = [
      "destinatarioOutro", "tempoRelacionamento", "formaTratamento",
      "historiaRelacao", "motivoEspecial", "idadeHomenageado",
      "tipoComemoracao", "tempoComemoracao", "incluirPedidoCasamento",
      "intencaoHomenagem", "qualidades", "memoriaMarcante", "mensagemFinal",
    ];
    for (const key of fields) next[key] = "";
    if (!isOccasionAllowed(value, current.ocasiao)) {
      next.ocasiao = "";
      next.ocasiaoOutra = "";
    }
  }

  if (field === "ocasiao") {
    const fields: Array<keyof QuestionnaireAnswers> = [
      "ocasiaoOutra", "motivoEspecial", "idadeHomenageado", "tipoComemoracao",
      "tempoComemoracao", "incluirPedidoCasamento", "intencaoHomenagem",
    ];
    for (const key of fields) next[key] = "";
  }

  return normalizeQuestionnaireAnswers(next);
}
