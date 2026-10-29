import { getStepFourContent } from "@/data/questionnaire-steps";
import type { QuestionnaireAnswers } from "@/types/questionnaire";

type StepFourProps = {
  answers: QuestionnaireAnswers;
  onChange: (
    field: keyof QuestionnaireAnswers,
    value: string,
  ) => void;
};

export default function StepFour({
  answers,
  onChange,
}: StepFourProps) {
  const content = getStepFourContent(answers);
  const name = answers.nomeHomenageado.trim() || "essa pessoa";

  return (
    <div>
      <label>
        {content.question}

        <textarea
          value={answers.motivoEspecial}
          onChange={(event) =>
            onChange("motivoEspecial", event.target.value)
          }
          placeholder={content.placeholder}
          rows={5}
        />
      </label>

      {answers.ocasiao === "Aniversário" && (
        <label>
          Quantos anos {name} está completando?

          <input
            type="text"
            value={answers.idadeHomenageado}
            onChange={(event) =>
              onChange("idadeHomenageado", event.target.value)
            }
            placeholder="Ex.: 30"
          />
        </label>
      )}

      {answers.ocasiao === "Aniversário de namoro / casamento" && (
        <>
          <h2 id="tipo-comemoracao">
            É aniversário de namoro ou de casamento?
          </h2>

          <div role="group" aria-labelledby="tipo-comemoracao">
            {["Namoro", "Casamento"].map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={answers.tipoComemoracao === option}
                onClick={() => onChange("tipoComemoracao", option)}
              >
                {option}
              </button>
            ))}
          </div>

          <label>
            Quanto tempo está sendo comemorado?

            <input
              type="text"
              value={answers.tempoComemoracao}
              onChange={(event) =>
                onChange("tempoComemoracao", event.target.value)
              }
              placeholder="Ex.: 2 anos, 6 meses"
            />
          </label>
        </>
      )}

      {answers.ocasiao === "Pedido de casamento" && (
        <>
          <h2 id="pedido-explicito">
            Quer que a música inclua explicitamente o pedido de casamento?
          </h2>

          <div role="group" aria-labelledby="pedido-explicito">
            {["Sim", "Não"].map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={answers.incluirPedidoCasamento === option}
                onClick={() =>
                  onChange("incluirPedidoCasamento", option)
                }
              >
                {option}
              </button>
            ))}
          </div>
        </>
      )}

      {answers.ocasiao === "Reconquista / Pedido de desculpas" && (
        <>
          <h2 id="intencao-homenagem">Qual é a intenção?</h2>

          <div role="group" aria-labelledby="intencao-homenagem">
            {[
              "Pedir desculpas",
              "Tentar uma reconquista",
              "Ambos",
            ].map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={answers.intencaoHomenagem === option}
                onClick={() => onChange("intencaoHomenagem", option)}
              >
                {option}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}