"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: Record<string, unknown>
  ) => string | undefined;
  remove: (widgetId: string) => void;
};

type Props = {
  onToken: (token: string) => void;
};

export default function ContactTurnstile({ onToken }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey) {
      return;
    }

    let active = true;
    let widgetId: string | undefined;

    const api = (
      window as Window & { turnstile?: TurnstileApi }
    ).turnstile;

    const timeout = window.setTimeout(() => {
      if (active) {
        onToken("");
        setVerified(false);
        setError(
          "A verificação demorou para carregar. Confira sua conexão e tente novamente."
        );
      }
    }, 30000);

    function fail(message: string) {
      if (!active) {
        return;
      }

      window.clearTimeout(timeout);
      onToken("");
      setVerified(false);
      setError(message);
    }

    if (ready && api && container.current) {
      try {
        widgetId = api.render(container.current, {
          sitekey: siteKey,
          action: "contact",
          theme: "auto",
          size: "compact",
          language: "pt-br",
          "response-field": false,
          callback: (token: string) => {
            if (!active) {
              return;
            }

            window.clearTimeout(timeout);
            onToken(token);
            setVerified(true);
            setError("");
          },
          "expired-callback": () => {
            fail("A verificação expirou. Faça a verificação novamente.");
          },
          "timeout-callback": () => {
            fail("O tempo da verificação terminou. Tente novamente.");
          },
          "error-callback": () => {
            fail(
              "Não foi possível concluir a verificação. Tente novamente."
            );
            return true;
          },
        });
      } catch {
        fail("Não foi possível carregar a verificação. Tente novamente.");
      }
    }

    return () => {
      active = false;
      window.clearTimeout(timeout);

      if (api && widgetId !== undefined) {
        api.remove(widgetId);
      }
    };
  }, [ready, attempt, siteKey, onToken]);

  function retry() {
    onToken("");
    setVerified(false);
    setError("");
    setAttempt((value) => value + 1);
  }

  if (!siteKey) {
    return (
      <p className="auth-message auth-message-error" role="alert">
        A verificação de segurança está indisponível.
        Utilize o e-mail de contato abaixo.
      </p>
    );
  }

  return (
    <div aria-label="Verificação de segurança">
      <Script
        id="contact-turnstile-script"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setReady(true)}
        onError={() => {
          onToken("");
          setVerified(false);
          setError(
            "Não foi possível carregar a verificação. Confira sua conexão ou os bloqueadores do navegador e recarregue a página."
          );
        }}
      />

      <div ref={container} />

      <p className="contact-note" role="status">
        {verified
          ? "Verificação concluída."
          : "Conclua a verificação de segurança para enviar."}
      </p>

      {error && (
        <div>
          <p className="auth-message auth-message-error" role="alert">
            {error}
          </p>

          {ready && (
            <button type="button" onClick={retry}>
              Tentar verificação novamente
            </button>
          )}
        </div>
      )}
    </div>
  );
}