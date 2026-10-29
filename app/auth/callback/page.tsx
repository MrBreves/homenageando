"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const enviando = useRef(false);

  const [verificando, setVerificando] = useState(true);
  const [completarCadastro, setCompletarCadastro] = useState(false);
  const [nome, setNome] = useState("");
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [usuarioId, setUsuarioId] = useState("");

  useEffect(() => {
    let ativo = true;

    async function handleAuthCallback() {
      try {
        const url = new URL(window.location.href);
        const fragmento = new URLSearchParams(url.hash.slice(1));

        if (
          url.searchParams.has("error") ||
          fragmento.has("error")
        ) {
          throw new Error("Autenticação não concluída.");
        }

        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError || !sessionData.session) {
          throw new Error("Sessão indisponível.");
        }

        const { data, error } = await supabase.auth.getUser();

        if (error || !data.user) {
          throw new Error("Usuário indisponível.");
        }

        if (!ativo) {
          return;
        }

        const metadata = data.user.user_metadata;
        const nomeCadastrado =
          typeof metadata.nome === "string"
            ? metadata.nome.trim()
            : "";

        if (
          nomeCadastrado &&
          metadata.aceitou_termos === true
        ) {
          sessionStorage.removeItem("homenageando_login_return");
          router.replace("/#inicio");
          return;
        }

        const nomeGoogle =
          typeof metadata.full_name === "string"
            ? metadata.full_name
            : typeof metadata.name === "string"
              ? metadata.name
              : "";

        setUsuarioId(data.user.id);
        setNome((nomeCadastrado || nomeGoogle).slice(0, 120));
        setCompletarCadastro(true);
        setVerificando(false);
      } catch {
        if (!ativo) {
          return;
        }

        setErro(
          "Não foi possível concluir o login. Volte para entrar e tente novamente.",
        );
        setVerificando(false);
      }
    }

    void handleAuthCallback();

    return () => {
      ativo = false;
    };
  }, [router]);

  async function handleCompletarCadastro(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (enviando.current) {
      return;
    }

    setErro("");

    const nomeLimpo = nome.trim();

    if (!nomeLimpo || nomeLimpo.length > 120) {
      setErro("Informe seu nome, com até 120 caracteres.");
      return;
    }

    if (!aceitouTermos) {
      setErro("Você precisa aceitar os termos para continuar.");
      return;
    }

    enviando.current = true;
    setSalvando(true);

    try {
      const { data: currentData, error: currentError } =
        await supabase.auth.getUser();

      if (
        currentError ||
        !currentData.user ||
        currentData.user.id !== usuarioId
      ) {
        throw new Error("Sessão alterada.");
      }

      const { error } = await supabase.auth.updateUser({
        data: {
          nome: nomeLimpo,
          aceitou_termos: true,
          aceitou_termos_em: new Date().toISOString(),
        },
      });

      if (error) {
        throw new Error("Não foi possível salvar.");
      }

      sessionStorage.removeItem("homenageando_login_return");
      router.replace("/#inicio");
    } catch {
      setErro(
        "Não foi possível salvar seu cadastro. Confira sua conexão e tente novamente. Se trocou de conta, entre novamente.",
      );
      enviando.current = false;
      setSalvando(false);
    }
  }

  return (
    <section className="auth-page" aria-labelledby="callback-title">
      <div className="auth-card">
        <header className="auth-heading">
          <span className="auth-decoration" aria-hidden="true">
            ♡
          </span>

          <h1 id="callback-title">
            {verificando
              ? "Confirmando sua conta"
              : completarCadastro
                ? "Falta só um detalhe"
                : "Vamos tentar novamente"}
          </h1>

          <p>
            {verificando
              ? "Aguarde enquanto concluímos seu acesso."
              : completarCadastro
                ? "Confirme seu nome e o aceite para continuar sua homenagem."
                : "Seu acesso não pôde ser concluído."}
          </p>
        </header>

        {verificando && (
          <p className="auth-callback-status" role="status">
            Verificando seu acesso...
          </p>
        )}

        {!verificando && completarCadastro && (
          <form
            className="auth-form"
            onSubmit={handleCompletarCadastro}
            aria-busy={salvando}
          >
            <label className="auth-field">
              <span>Nome</span>
              <input
                type="text"
                name="nome"
                autoComplete="name"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                maxLength={120}
                disabled={salvando}
                required
              />
            </label>

            <div className="auth-consent">
              <label className="auth-terms">
                <input
                  type="checkbox"
                  checked={aceitouTermos}
                  onChange={(event) =>
                    setAceitouTermos(event.target.checked)
                  }
                  aria-describedby="google-documentos"
                  disabled={salvando}
                  required
                />
                <span>
                  Aceito os Termos de Uso e declaro que li a Política
                  de Privacidade.
                </span>
              </label>

              <p id="google-documentos" className="auth-legal-links">
                <a href="/termos" target="_blank" rel="noopener noreferrer">
                  Ler Termos de Uso (nova aba)
                </a>
                <a href="/privacidade" target="_blank" rel="noopener noreferrer">
                  Ler Política de Privacidade (nova aba)
                </a>
              </p>
            </div>

            {erro && (
              <p className="auth-message auth-message-error" role="alert">
                {erro}
              </p>
            )}

            <button
              className="auth-submit"
              type="submit"
              disabled={salvando}
            >
              {salvando ? "Salvando..." : "Continuar minha homenagem"}
            </button>
          </form>
        )}

        {!verificando && !completarCadastro && erro && (
          <p className="auth-message auth-message-error" role="alert">
            {erro}
          </p>
        )}

        {!verificando && !salvando && (
          <p className="auth-switch">
            <a href="/entrar">Voltar para entrar</a>
          </p>
        )}
      </div>
    </section>
  );
}