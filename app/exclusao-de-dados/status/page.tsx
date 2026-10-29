
"use client";

import { useState } from "react";

const messages: Record<string, string> = {
  COMPLETED:
    "Exclusão concluída no Homenageando. Registros comerciais sujeitos a retenção permanecem restritos, conforme a Política de Privacidade.",
  PROCESSING:
    "Solicitação registrada. A exclusão está em processamento; ainda não foi concluída.",
  REVIEW:
    "A solicitação precisa de análise do atendimento antes de concluir. Entre em contato e informe o protocolo.",
  RETRY:
    "Houve uma falha temporária. A solicitação permanece registrada para nova tentativa. Se persistir, procure o atendimento.",
  NOT_FOUND:
    "Protocolo não encontrado. Confira o código ou consulte o atendimento.",
};

export default function StatusExclusaoPage() {

  const [initialCode] = useState(() => {
    if (typeof window === "undefined") return "";

    const hash = decodeURIComponent(
      window.location.hash.slice(1)
    );

    if (hash) return hash;

    try {
      return (
        sessionStorage.getItem(
          "homenageando_deletion_protocol"
        ) ?? ""
      );
    } catch {
      return "";
    }
  });

  const [code, setCode] = useState(initialCode);

  const [emailNotice] = useState(() => {
    if (typeof window === "undefined") return "";

    try {
      const sent = sessionStorage.getItem(
        "homenageando_deletion_email_sent"
      );

      if (sent === "true") {
        return "O envio do protocolo por e-mail foi aceito pelo servidor de e-mail. Confira também a pasta de spam.";
      }

      if (sent === "false") {
        return "Não foi possível confirmar o envio do e-mail. Copie e guarde o protocolo apresentado nesta página.";
      }
    } catch {
      // Armazenamento indisponível.
    }

    return "";
  });

  const [copied, setCopied] = useState(false);


  const [message, setMessage] = useState(
    "Informe seu protocolo para consultar."
  );

  const [loading, setLoading] = useState(false);

  async function consultar(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);

    try {
      const response = await fetch(
        "/api/account/delete/status",
        {
          method: "POST",
          headers: {
            "Content-Type": "text/plain",
          },
          body: code.trim(),
          cache: "no-store",
        }
      );

      const result = await response.json();

      setMessage(
        response.ok
          ? messages[result.status] ??
              "Resposta indisponível. Tente novamente."
          : result.error ?? "Falha na consulta."
      );
    } catch {
      setMessage(
        "Falha de comunicação. Tente novamente."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <article
      className="legal-page"
      aria-labelledby="status-title"
    >
      <div className="legal-card">
        <h1 id="status-title">
          Acompanhar exclusão
        </h1>

        <p>
          Guarde o protocolo. Ele permite consultar
          o andamento sem acessar sua conta.
        </p>

        <form onSubmit={consultar}>
          <label htmlFor="protocol">
            Protocolo de exclusão
          </label>

          <input
            id="protocol"
            value={code}
            onChange={(event) =>
              setCode(event.target.value)
            }
            maxLength={36}
            required
            autoComplete="off"
            spellCheck={false}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: 12,
              margin: "8px 0 16px",
            }}
          />

          <button
            className="auth-submit"
            type="submit"
            disabled={loading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 44,
              padding: "10px 22px",
              border: "1px solid #d19a2a",
              borderRadius: 10,
              background: "#f2c45e",
              color: "#2b1b13",
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.65 : 1,
            }}
          >
            {loading
              ? "Consultando..."
              : "Consultar andamento"}
          </button>

        </form>

        {code && (
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(code.trim());
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
            style={{
              marginTop: 12,
              padding: "10px 16px",
              border: "1px solid #c9a976",
              borderRadius: 8,
              background: "#fffaf2",
              color: "#2b1b13",
              cursor: "pointer",
            }}
          >
            {copied ? "Protocolo copiado" : "Copiar protocolo"}
          </button>
        )}

        {emailNotice && (
          <p style={{ marginTop: 16, overflowWrap: "anywhere" }}>
            {emailNotice}
          </p>
        )}

        <p
          role="status"
          aria-live="polite"
          style={{
            overflowWrap: "anywhere",
          }}
        >
          {message}
        </p>


        <nav
          className="legal-navigation"
          aria-label="Links relacionados"
        >
          <a href="/contato">
            Falar com o atendimento
          </a>

          <a href="/privacidade">
            Privacidade
          </a>
        </nav>
      </div>
    </article>
  );
}
