
import { estilosMusicais } from "@/data/questionnaire-options";
import { getMusicTitle } from "@/lib/music-title";
import type { QuestionnaireAnswers } from "@/types/questionnaire";

type StepSevenProps = {
  answers: QuestionnaireAnswers;
  onChange: (
    field: keyof QuestionnaireAnswers,
    value: string,
  ) => void;
};

const tonsEmocionais = [
  "Romântico",
  "Emocionante",
  "Alegre",
  "Divertido",
  "Inspirador",
  "Nostálgico",
] as const;

const vozes = [
  "Feminina",
  "Masculina",
] as const;

export default function StepSeven({
  answers,
  onChange,
}: StepSevenProps) {
  const tituloAutomatico =
    answers.gerarTituloAutomaticamente === "Sim";

  const tituloSugerido = getMusicTitle({
    ...answers,
    gerarTituloAutomaticamente: "Sim",
  });

  return (
    <div>
      <h2>Qual estilo musical combina mais?</h2>

      <div>
        {estilosMusicais.map((estilo) => (
          <button
            key={estilo}
            type="button"
            onClick={() =>
              onChange("estiloMusical", estilo)
            }
            aria-pressed={
              answers.estiloMusical === estilo
            }
          >
            {answers.estiloMusical === estilo
              ? "✓ "
              : ""}
            {estilo}
          </button>
        ))}
      </div>

      <h2>Qual deve ser o clima da música?</h2>

      <div>
        {tonsEmocionais.map((tom) => (
          <button
            key={tom}
            type="button"
            onClick={() =>
              onChange("tomEmocional", tom)
            }
            aria-pressed={
              answers.tomEmocional === tom
            }
          >
            {answers.tomEmocional === tom
              ? "✓ "
              : ""}
            {tom}
          </button>
        ))}
      </div>

      <h2>Quem deve cantar?</h2>

      <div>
        {vozes.map((voz) => (
          <button
            key={voz}
            type="button"
            onClick={() =>
              onChange("vozCantor", voz)
            }
            aria-pressed={
              answers.vozCantor === voz
            }
          >
            {answers.vozCantor === voz
              ? "✓ "
              : ""}
            Voz {voz.toLowerCase()}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 32 }}>
        <h2>Qual será o nome da sua música?</h2>

        <p>
          Escolha o título ou utilize a opção automática.
        </p>

        <label
          htmlFor="titulo-musica"
          style={{
            display: "block",
            marginBottom: 8,
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          Nome da música
        </label>

        <input
          id="titulo-musica"
          type="text"
          value={
            tituloAutomatico
              ? tituloSugerido
              : answers.tituloMusica
          }
          maxLength={100}
          disabled={tituloAutomatico}
          onChange={(event) =>
            onChange("tituloMusica", event.target.value)
          }
          placeholder={tituloSugerido}
          style={{
            boxSizing: "border-box",
            display: "block",
            width: "100%",
            minHeight: 46,
            padding: "12px",
            border: "1px solid #d6bd93",
            borderRadius: 10,
            fontSize: 16,
            background: tituloAutomatico
              ? "#eee8df"
              : "#ffffff",
            color: "#2b1b13",
          }}
        />

        <label
          htmlFor="gerar-titulo-automatico"
          style={{
            display: "inline-flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: 10,
            width: "auto",
            maxWidth: "100%",
            marginTop: 14,
            padding: 0,
            fontSize: 16,
            fontWeight: 400,
            lineHeight: 1.4,
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          <input
            id="gerar-titulo-automatico"
            type="checkbox"
            checked={tituloAutomatico}
            onChange={(event) =>
              onChange(
                "gerarTituloAutomaticamente",
                event.target.checked
                  ? "Sim"
                  : "Não"
              )
            }
            style={{
              display: "inline-block",
              position: "static",
              width: 18,
              height: 18,
              minWidth: 18,
              minHeight: 18,
              flex: "0 0 18px",
              margin: 0,
              padding: 0,
              verticalAlign: "middle",
              accentColor: "#b87912",
              cursor: "pointer",
            }}
          />
          <span
            style={{
              display: "inline",
              margin: 0,
              padding: 0,
              fontSize: 16,
              fontWeight: 400,
              lineHeight: 1.4,
            }}
          >
            Gerar automático
          </span>
        </label>
      </div>

    </div>
  );
}
