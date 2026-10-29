import type { QuestionnaireAnswers } from "@/types/questionnaire";
import { estilosMusicais } from "@/data/questionnaire-options";

export const QUESTIONNAIRE_TOTAL_STEPS = 8;

export function validateQuestionnaire(
  answers: QuestionnaireAnswers,
  throughStep = QUESTIONNAIRE_TOTAL_STEPS,
): { step: number; message: string } | null {
  const missing = (field: keyof QuestionnaireAnswers) =>
    answers[field].trim() === "";

  const required: Array<{
    step: number;
    field: keyof QuestionnaireAnswers;
    label: string;
  }> = [];

  if (!questionnaireRecipients.includes(answers.destinatario)) {
    return {
      step: 1,
      message: "Escolha quem vai receber a homenagem.",
    };
  }

  if (answers.destinatario === "Outro") {
    required.push({
      step: 1,
      field: "destinatarioOutro",
      label: "Quem vai receber essa homenagem?",
    });
  }

  required.push(
    {
      step: 1,
      field: "nomeUsuario",
      label: "Seu primeiro nome ou apelido",
    },
    {
      step: 1,
      field: "nomeHomenageado",
      label: "Nome de quem vai receber a música",
    },
  );

  if (throughStep >= 2) {
    required.push({
      step: 2,
      field: "ocasiao",
      label: "Qual é a ocasião?",
    });

    if (answers.ocasiao === "Outra ocasião") {
      required.push({
        step: 2,
        field: "ocasiaoOutra",
        label: "Qual momento você quer celebrar?",
      });
    }
  }

  if (throughStep >= 3) {
    const content = getStepThreeContent(answers);

    required.push(
      {
        step: 3,
        field: content.shortField,
        label: content.shortLabel.replace(" (opcional)", ""),
      },
      {
        step: 3,
        field: "historiaRelacao",
        label: content.storyLabel,
      },
    );
  }

  if (throughStep >= 4) {
    required.push({
      step: 4,
      field: "motivoEspecial",
      label: getStepFourContent(answers).question,
    });

    if (answers.ocasiao === "Aniversário") {
      required.push({
        step: 4,
        field: "idadeHomenageado",
        label: "Quantos anos o homenageado está completando?",
      });
    }

    if (answers.ocasiao === "Aniversário de namoro / casamento") {
      required.push(
        {
          step: 4,
          field: "tipoComemoracao",
          label: "É aniversário de namoro ou de casamento?",
        },
        {
          step: 4,
          field: "tempoComemoracao",
          label: "Quanto tempo está sendo comemorado?",
        },
      );
    }

    if (answers.ocasiao === "Pedido de casamento") {
      required.push({
        step: 4,
        field: "incluirPedidoCasamento",
        label: "Quer incluir explicitamente o pedido de casamento?",
      });
    }

    if (answers.ocasiao === "Reconquista / Pedido de desculpas") {
      required.push({
        step: 4,
        field: "intencaoHomenagem",
        label: "Qual é a intenção?",
      });
    }
  }

  if (throughStep >= 5) {
    required.push(
      {
        step: 5,
        field: "qualidades",
        label: "Quais qualidades mais representam essa pessoa?",
      },
      {
        step: 5,
        field: "memoriaMarcante",
        label: "Conte uma lembrança ou momento marcante de vocês",
      },
    );
  }

  if (throughStep >= 6) {
    required.push({
      step: 6,
      field: "mensagemFinal",
      label: "O que você gostaria de dizer para essa pessoa?",
    });
  }

  if (throughStep >= 7) {
    required.push(
      {
        step: 7,
        field: "estiloMusical",
        label: "Qual estilo musical combina mais?",
      },
      {
        step: 7,
        field: "tomEmocional",
        label: "Qual deve ser o clima da música?",
      },
      {
        step: 7,
        field: "vozCantor",
        label: "Quem deve cantar?",
      },
    );
  }

  for (let step = 1; step <= Math.min(throughStep, 7); step += 1) {
    const emptyField = required.find(
      (item) => item.step === step && missing(item.field),
    );

    if (emptyField) {
      return {
        step,
        message: `Responda ao campo: “${emptyField.label}”.`,
      };
    }

    if (
      step === 2 &&
      !isOccasionAllowed(answers.destinatario, answers.ocasiao)
    ) {
      return {
        step,
        message: "Escolha uma ocasião disponível para esse homenageado.",
      };
    }

    if (step === 4) {
      if (
        answers.ocasiao === "Aniversário de namoro / casamento" &&
        !["Namoro", "Casamento"].includes(answers.tipoComemoracao)
      ) {
        return {
          step,
          message: "Selecione Namoro ou Casamento.",
        };
      }

      if (
        answers.ocasiao === "Pedido de casamento" &&
        !["Sim", "Não"].includes(answers.incluirPedidoCasamento)
      ) {
        return {
          step,
          message: "Selecione Sim ou Não para incluir o pedido na música.",
        };
      }

      if (
        answers.ocasiao === "Reconquista / Pedido de desculpas" &&
        !["Pedir desculpas", "Tentar uma reconquista", "Ambos"].includes(
          answers.intencaoHomenagem,
        )
      ) {
        return {
          step,
          message: "Selecione uma das intenções disponíveis.",
        };
      }
    }

    if (step === 7) {
      if (
        answers.gerarTituloAutomaticamente !== "Sim" &&
        !answers.tituloMusica.trim()
      ) {
        return {
          step: 7,
          message:
            "Digite o nome da música ou marque a opção de criação automática.",
        };
      }

      if (
        !estilosMusicais.some(
          (style) => style === answers.estiloMusical
        )
      ) {
        return {
          step,
          message: "Selecione um estilo musical disponível.",
        };
      }

      if (
        ![
          "Romântico",
          "Emocionante",
          "Alegre",
          "Divertido",
          "Inspirador",
          "Nostálgico",
        ].includes(answers.tomEmocional)
      ) {
        return {
          step,
          message: "Selecione um clima disponível para a música.",
        };
      }

      if (!["Feminina", "Masculina"].includes(answers.vozCantor)) {
        return {
          step,
          message: "Selecione a voz Feminina ou Masculina.",
        };
      }
    }
  }

  return null;
}

export const questionnaireRecipients = [
  "Meu namorado / marido / noivo",
  "Minha namorada / esposa / noiva",
  "Meu ex",
  "Minha ex",
  "Meu pai",
  "Minha mãe",
  "Meu filho",
  "Minha filha",
  "Meu amigo",
  "Minha amiga",
  "Meu irmão",
  "Minha irmã",
  "Meu avô",
  "Minha avó",
  "Outro",
];

const questionnaireOccasions = [
  "Aniversário",
  "Declaração de amor",
  "Dia dos namorados",
  "Aniversário de namoro / casamento",
  "Pedido de casamento",
  "Casamento",
  "Reconquista / Pedido de desculpas",
  "Dia das mães",
  "Dia dos pais",
  "Homenagem / Saudade",
  "Agradecimento",
  "Só porque sim",
  "Outra ocasião",
];

const commonOccasions = [
  "Aniversário",
  "Homenagem / Saudade",
  "Agradecimento",
  "Só porque sim",
  "Outra ocasião",
];

const romanticOccasions = [
  "Declaração de amor",
  "Dia dos namorados",
  "Aniversário de namoro / casamento",
  "Pedido de casamento",
  "Casamento",
  "Reconquista / Pedido de desculpas",
];

export function getAllowedOccasions(destinatario: string): string[] {
  if (!questionnaireRecipients.includes(destinatario)) {
    return [];
  }

  let additionalOccasions: string[] = [];

  switch (destinatario) {
    case "Meu namorado / marido / noivo":
      additionalOccasions = [...romanticOccasions, "Dia dos pais"];
      break;

    case "Minha namorada / esposa / noiva":
      additionalOccasions = [...romanticOccasions, "Dia das mães"];
      break;

    case "Meu ex":
    case "Minha ex":
      additionalOccasions = [
        "Declaração de amor",
        "Reconquista / Pedido de desculpas",
      ];
      break;

    case "Meu pai":
    case "Meu avô":
      additionalOccasions = ["Dia dos pais"];
      break;

    case "Minha mãe":
    case "Minha avó":
      additionalOccasions = ["Dia das mães"];
      break;

    case "Meu filho":
    case "Meu irmão":
    case "Meu amigo":
      additionalOccasions = ["Casamento", "Dia dos pais"];
      break;

    case "Minha filha":
    case "Minha irmã":
    case "Minha amiga":
      additionalOccasions = ["Casamento", "Dia das mães"];
      break;
  }

  return questionnaireOccasions.filter(
    (occasion) =>
      commonOccasions.includes(occasion) ||
      additionalOccasions.includes(occasion),
  );
}

export function isOccasionAllowed(
  destinatario: string,
  ocasiao: string,
): boolean {
  return getAllowedOccasions(destinatario).includes(ocasiao);
}

export const questionnaireSteps = [
  {
    step: 1,
    title: "Para quem é essa música?",
    subtitle: "Escolha quem você quer homenagear e conte como vocês se chamam.",
  },
  {
    step: 2,
    title: "Qual é a ocasião?",
    subtitle: "Escolha o motivo dessa homenagem especial.",
  },
  {
    step: 3,
    title: "Conte um pouco da história de vocês",
    subtitle: "Há quanto tempo essa pessoa faz parte da sua vida? Como é a relação de vocês?",
  },
  {
    step: 4,
    title: "Por que essa ocasião é especial?",
    subtitle: "Conte o que esse momento significa e por que você quer transformá-lo em música.",
  },
  {
    step: 5,
    title: "O que torna essa pessoa especial?",
    subtitle: "Lembre das qualidades e dos momentos que fazem essa pessoa ser única para você.",
  },
  {
    step: 6,
    title: "O que você gostaria de dizer?",
    subtitle: "Escreva com suas palavras a mensagem que você quer transmitir nessa homenagem.",
  },
  {
    step: 7,
    title: "Como você quer sua música?",
    subtitle: "Escolha o estilo musical, a emoção e a voz que combinam com sua homenagem.",
  },
  {
    step: 8,
    title: "Tudo pronto para criar sua música",
    subtitle: "Clique em gerar música para ouvir o preview.",
  },
] as const;
type StepThreeContent = {
  title: string;
  subtitle: string;
  shortField:
    | "tempoRelacionamento"
    | "formaTratamento"
    | "destinatarioOutro";
  shortLabel: string;
  shortPlaceholder: string;
  storyLabel: string;
  storyPlaceholder: string;
};

type FamilyContent = {
  title: string;
  subtitle: string;
  shortLabel: string;
  shortPlaceholder: string;
  storyLabel: string;
};

const familyContent: Record<string, FamilyContent> = {
  "Meu pai": {
    title: "Conte um pouco da história com seu pai",
    subtitle: "Conte sobre a presença de [Nome] na sua vida.",
    shortLabel: "Como você costuma chamar seu pai? (opcional)",
    shortPlaceholder: "Ex.: pai, paizão",
    storyLabel: "Como é a sua relação com seu pai?",
  },
  "Minha mãe": {
    title: "Conte um pouco da história com sua mãe",
    subtitle: "Conte sobre a presença de [Nome] na sua vida.",
    shortLabel: "Como você costuma chamar sua mãe? (opcional)",
    shortPlaceholder: "Ex.: mãe, mainha",
    storyLabel: "Como é a sua relação com sua mãe?",
  },
  "Meu filho": {
    title: "Conte um pouco da história com seu filho",
    subtitle:
      "Conte sobre a sua relação com [Nome] e a trajetória de vocês.",
    shortLabel: "Como você costuma chamar seu filho? (opcional)",
    shortPlaceholder: "Ex.: filho, meu pequeno",
    storyLabel: "Como é a sua relação com seu filho?",
  },
  "Minha filha": {
    title: "Conte um pouco da história com sua filha",
    subtitle:
      "Conte sobre a sua relação com [Nome] e a trajetória de vocês.",
    shortLabel: "Como você costuma chamar sua filha? (opcional)",
    shortPlaceholder: "Ex.: filha, minha pequena",
    storyLabel: "Como é a sua relação com sua filha?",
  },
  "Meu irmão": {
    title: "Conte um pouco da história com seu irmão",
    subtitle: "Conte sobre a sua relação com [Nome].",
    shortLabel: "Como você costuma chamar seu irmão? (opcional)",
    shortPlaceholder: "Ex.: mano, irmão",
    storyLabel:
      "Como é a relação de vocês e como ela foi construída ao longo do tempo?",
  },
  "Minha irmã": {
    title: "Conte um pouco da história com sua irmã",
    subtitle: "Conte sobre a sua relação com [Nome].",
    shortLabel: "Como você costuma chamar sua irmã? (opcional)",
    shortPlaceholder: "Ex.: mana, irmã",
    storyLabel:
      "Como é a relação de vocês e como ela foi construída ao longo do tempo?",
  },
  "Meu avô": {
    title: "Conte um pouco da história com seu avô",
    subtitle: "Conte sobre a presença de [Nome] na sua vida.",
    shortLabel: "Como você costuma chamar seu avô? (opcional)",
    shortPlaceholder: "Ex.: vô, vovô",
    storyLabel: "Como é a sua relação com seu avô?",
  },
  "Minha avó": {
    title: "Conte um pouco da história com sua avó",
    subtitle: "Conte sobre a presença de [Nome] na sua vida.",
    shortLabel: "Como você costuma chamar sua avó? (opcional)",
    shortPlaceholder: "Ex.: vó, vovó",
    storyLabel: "Como é a sua relação com sua avó?",
  },
};

function insertRecipientName(
  text: string,
  answers: QuestionnaireAnswers,
): string {
  const name =
    answers.nomeHomenageado.trim() || "essa pessoa";

  return text.split("[Nome]").join(name);
}

export function getStepThreeContent(
  answers: QuestionnaireAnswers,
): StepThreeContent {
  const family = familyContent[answers.destinatario];

  if (family) {
    return {
      ...family,
      subtitle: insertRecipientName(family.subtitle, answers),
      shortLabel: family.shortLabel.replace(" (opcional)", ""),
      shortField: "formaTratamento",
      storyPlaceholder:
        "Conte com suas palavras como é a relação de vocês.",
    };
  }

  if (
    answers.destinatario === "Meu namorado / marido / noivo" ||
    answers.destinatario === "Minha namorada / esposa / noiva"
  ) {
    return {
      title: "Conte um pouco da história de vocês",
      subtitle: insertRecipientName(
        "Conte como sua história com [Nome] começou e sobre a relação de vocês.",
        answers,
      ),
      shortField: "tempoRelacionamento",
      shortLabel: "Há quanto tempo vocês estão juntos?",
      shortPlaceholder: "Ex.: 5 anos, desde 2018",
      storyLabel: "Como começou a história de vocês?",
      storyPlaceholder:
        "Conte como se conheceram e como a relação começou.",
    };
  }

  if (
    answers.destinatario === "Meu ex" ||
    answers.destinatario === "Minha ex"
  ) {
    return {
      title: "Conte um pouco da história de vocês",
      subtitle: insertRecipientName(
        "Conte o que viveu com [Nome] e o contexto da relação de vocês hoje.",
        answers,
      ),
      shortField: "tempoRelacionamento",
      shortLabel: "Por quanto tempo vocês estiveram juntos?",
      shortPlaceholder: "Ex.: 2 anos",
      storyLabel:
        "Como foi a história de vocês e como é a relação hoje?",
      storyPlaceholder:
        "Conte o contexto que deseja considerar nesta homenagem.",
    };
  }

  if (
    answers.destinatario === "Meu amigo" ||
    answers.destinatario === "Minha amiga"
  ) {
    return {
      title: "Conte um pouco dessa amizade",
      subtitle: insertRecipientName(
        "Conte como [Nome] passou a fazer parte da sua vida.",
        answers,
      ),
      shortField: "tempoRelacionamento",
      shortLabel: "Há quanto tempo existe essa amizade?",
      shortPlaceholder: "Ex.: 10 anos, desde a escola",
      storyLabel: "Como começou a amizade de vocês?",
      storyPlaceholder:
        "Conte como se conheceram e como essa amizade se desenvolveu.",
    };
  }

  if (answers.destinatario === "Outro") {
    return {
      title: "Conte um pouco da história de vocês",
      subtitle: insertRecipientName(
        "Conte quem é [Nome] para você e sobre a relação de vocês.",
        answers,
      ),
      shortField: "destinatarioOutro",
      shortLabel: "Qual é a sua relação com essa pessoa?",
      shortPlaceholder: "Ex.: minha professora",
      storyLabel: "Conte um pouco da história de vocês.",
      storyPlaceholder:
        "Conte como essa pessoa passou a fazer parte da sua vida.",
    };
  }

  return {
    title: "Conte um pouco da história de vocês",
    subtitle:
      "Há quanto tempo essa pessoa faz parte da sua vida? Como é a relação de vocês?",
    shortField: "tempoRelacionamento",
    shortLabel: "Há quanto tempo vocês se conhecem / convivem?",
    shortPlaceholder: "Ex.: 5 anos, desde 2018, a vida inteira",
    storyLabel: "Conte um pouco sobre a relação de vocês",
    storyPlaceholder:
      "Conte com suas palavras como é a relação de vocês.",
  };
}

type StepFourContent = {
  title: string;
  subtitle: string;
  question: string;
  placeholder: string;
};

const occasionContent: Record<string, StepFourContent> = {
  "Aniversário": {
    title: "O que torna este aniversário especial?",
    subtitle:
      "Conte o que você quer celebrar na vida de [Nome].",
    question:
      "O que você gostaria de destacar neste aniversário?",
    placeholder:
      "Conte por que este aniversário merece uma homenagem.",
  },
  "Declaração de amor": {
    title: "O que inspirou essa declaração?",
    subtitle:
      "Conte o que motivou você a transformar seus sentimentos por [Nome] em música.",
    question:
      "Por que você quer fazer essa declaração agora?",
    placeholder:
      "Conte o que despertou essa vontade de se declarar.",
  },
  "Dia dos namorados": {
    title: "O que torna este Dia dos Namorados especial?",
    subtitle:
      "Conte o significado desta data para a homenagem a [Nome].",
    question:
      "O que você quer celebrar nesta data?",
    placeholder:
      "Conte o que torna esta comemoração especial.",
  },
  "Aniversário de namoro / casamento": {
    title: "Que história vocês estão celebrando?",
    subtitle:
      "Conte qual marco da relação será celebrado nesta homenagem a [Nome].",
    question:
      "O que torna essa comemoração especial?",
    placeholder:
      "Conte o significado desse marco e o que deseja celebrar.",
  },
  "Pedido de casamento": {
    title: "Conte sobre esse pedido de casamento",
    subtitle:
      "Conte como a música para [Nome] fará parte desse momento.",
    question:
      "Como você imagina o pedido e qual será o papel da música?",
    placeholder:
      "Conte como deseja preparar esse momento.",
  },
  "Casamento": {
    title: "O que torna esse casamento especial?",
    subtitle:
      "Conte o contexto do casamento e da homenagem a [Nome].",
    question:
      "De quem é o casamento e o que você deseja celebrar com essa homenagem?",
    placeholder:
      "Conte quem está se casando e o significado desta homenagem.",
  },
  "Reconquista / Pedido de desculpas": {
    title: "O que motivou essa homenagem?",
    subtitle:
      "Conte o que você deseja esclarecer ou reconhecer na sua relação com [Nome].",
    question:
      "O que aconteceu e por que você decidiu fazer essa homenagem?",
    placeholder:
      "Compartilhe apenas os detalhes que deseja considerar na música.",
  },
  "Dia das mães": {
    title: "O que você quer celebrar neste Dia das Mães?",
    subtitle:
      "Conte por que você escolheu homenagear [Nome] nesta data.",
    question:
      "O que torna essa pessoa especial no contexto do Dia das Mães?",
    placeholder:
      "Conte o que deseja reconhecer nesta homenagem.",
  },
  "Dia dos pais": {
    title: "O que você quer celebrar neste Dia dos Pais?",
    subtitle:
      "Conte por que você escolheu homenagear [Nome] nesta data.",
    question:
      "O que torna essa pessoa especial no contexto do Dia dos Pais?",
    placeholder:
      "Conte o que deseja reconhecer nesta homenagem.",
  },
  "Homenagem / Saudade": {
    title: "O que motivou essa homenagem?",
    subtitle:
      "Conte o significado desta homenagem a [Nome] e o que despertou essa vontade.",
    question:
      "Qual é o motivo da homenagem ou da saudade?",
    placeholder:
      "Explique com suas palavras o contexto desta homenagem.",
  },
  "Agradecimento": {
    title: "Pelo que você deseja agradecer?",
    subtitle:
      "Conte o que [Nome] fez ou representa na sua vida que merece esse agradecimento.",
    question:
      "Qual é o motivo do agradecimento e como isso marcou você?",
    placeholder:
      "Conte o gesto, apoio ou acontecimento pelo qual deseja agradecer.",
  },
  "Só porque sim": {
    title: "O que despertou essa vontade de homenagear?",
    subtitle:
      "Uma homenagem não precisa de uma data especial. Conte o que fez você pensar em [Nome].",
    question:
      "Por que você decidiu presentear essa pessoa com uma música?",
    placeholder:
      "Conte o que despertou essa vontade.",
  },
  "Outra ocasião": {
    title: "O que torna essa ocasião especial?",
    subtitle:
      "Conte o significado da ocasião que você informou na primeira etapa.",
    question:
      "O que você deseja celebrar ou marcar nessa ocasião?",
    placeholder:
      "Conte o significado desse momento para você.",
  },
};

export function getStepFourContent(
  answers: QuestionnaireAnswers,
): StepFourContent {
  const content = occasionContent[answers.ocasiao] ?? {
    title: "Por que essa ocasião é especial?",
    subtitle:
      "Conte o que esse momento significa e por que você quer transformá-lo em música.",
    question: "Conte brevemente",
    placeholder: "Conte por que essa ocasião é especial.",
  };

  return {
    ...content,
    subtitle: insertRecipientName(content.subtitle, answers),
  };
}