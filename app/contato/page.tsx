"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ContactTurnstile from "@/components/ContactTurnstile";

export default function ContatoPage() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [assunto, setAssunto] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState("");
  const [erro, setErro] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileVersion, setTurnstileVersion] = useState(0);

  const envioEmAndamento = useRef(false);
  const nomeEditado = useRef(false);
  const emailEditado = useRef(false);

  useEffect(() => {
    let ativo = true;

    async function preencherUsuario() {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (!ativo || error || !data.user) {
          return;
        }

        const metadata = data.user.user_metadata;
        const nomeDisponivel =
          metadata?.nome || metadata?.full_name || metadata?.name;

        if (
          !nomeEditado.current &&
          typeof nomeDisponivel === "string"
        ) {
          setNome(nomeDisponivel.slice(0, 120));
        }

        if (!emailEditado.current && data.user.email) {
          setEmail(data.user.email);
        }
      } catch {
        // O formulário continua disponível para preenchimento manual.
      }
    }

    void preencherUsuario();

    return () => {
      ativo = false;
    };
  }, []);

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (envioEmAndamento.current) {
      return;
    }

    setErro("");
    setSucesso("");

    if (nome.trim().length < 2 || /[\r\n]/.test(nome)) {
      setErro("Informe seu nome com pelo menos 2 caracteres.");
      return;
    }

    if (
      email.trim().length > 254 ||
      !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email.trim())
    ) {
      setErro("Informe um e-mail válido.");
      return;
    }

    if (mensagem.trim().length < 10) {
      setErro("Escreva uma mensagem com pelo menos 10 caracteres.");
      return;
    }

    if (!turnstileToken) {
      setErro("Conclua a verificação de segurança antes de enviar.");
      return;
    }

    envioEmAndamento.current = true;
    setEnviando(true);

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: nome.trim(),
          email: email.trim(),
          subject: assunto,
          message: mensagem.trim(),
          turnstileToken,
        }),
        signal: controller.signal,
      });

      const result: unknown = await response.json();

      const resposta =
        result && typeof result === "object"
          ? (result as Record<string, unknown>)
          : null;

      if (!response.ok || resposta?.ok !== true) {
        setErro(
          typeof resposta?.message === "string"
            ? resposta.message
            : "Não foi possível confirmar o envio. Tente novamente mais tarde."
        );
        return;
      }

      setSucesso(
        "Sua mensagem foi encaminhada ao atendimento. Responderemos pelo e-mail informado."
      );
      setMensagem("");
      setAssunto("");
    } catch {
      setErro(
        "Não foi possível confirmar o envio. Sua mensagem foi mantida. Antes de reenviar, aguarde um pouco ou entre em contato pelo e-mail abaixo."
      );
    } finally {
      window.clearTimeout(timeout);
      envioEmAndamento.current = false;
      setEnviando(false);
      setTurnstileToken("");
      setTurnstileVersion((value) => value + 1);
    }
  }

  return (
    <section className="auth-page contact-page" aria-labelledby="contact-title">
      <div className="auth-card">
        <div className="auth-heading">
          <h1 id="contact-title">Fale com a gente</h1>
          <p>
            Tem uma dúvida ou precisa de ajuda com sua homenagem?
            Envie sua mensagem.
          </p>
        </div>

        <form className="auth-form" onSubmit={enviar} aria-busy={enviando}>
          <p className="contact-note">Todos os campos são obrigatórios.</p>

          <label className="auth-field" htmlFor="contact-name">
            Nome
            <input
              id="contact-name"
              name="name"
              type="text"
              autoComplete="name"
              required
              minLength={2}
              maxLength={120}
              value={nome}
              disabled={enviando}
              onChange={(event) => {
                nomeEditado.current = true;
                setNome(event.target.value);
              }}
            />
          </label>

          <label className="auth-field" htmlFor="contact-email">
            E-mail para resposta
            <input
              id="contact-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              disabled={enviando}
              onChange={(event) => {
                emailEditado.current = true;
                setEmail(event.target.value);
              }}
            />
          </label>

          <label className="auth-field" htmlFor="contact-subject">
            Assunto
            <select
              id="contact-subject"
              name="subject"
              required
              value={assunto}
              disabled={enviando}
              onChange={(event) => setAssunto(event.target.value)}
            >
              <option value="">Selecione um assunto</option>
              <option value="duvida">Dúvida</option>
              <option value="musica">Problema com a música</option>
              <option value="pagamento">Pagamento</option>
              <option value="reembolso">Cancelamento ou reembolso</option>
              <option value="privacidade">Privacidade</option>
            </select>
          </label>

          <label className="auth-field" htmlFor="contact-message">
            Mensagem
            <textarea
              id="contact-message"
              name="message"
              required
              minLength={10}
              maxLength={5000}
              rows={7}
              value={mensagem}
              disabled={enviando}
              aria-describedby="contact-message-help"
              onChange={(event) => setMensagem(event.target.value)}
            />
          </label>

          <p id="contact-message-help" className="contact-note">
            De 10 a 5.000 caracteres. Se a mensagem for sobre uma música,
            informe o número da OS. Não envie senhas nem dados de cartão.
          </p>

          {erro && (
            <p className="auth-message auth-message-error" role="alert">
              {erro}
            </p>
          )}

          {sucesso && (
            <p className="auth-message auth-message-success" role="status">
              {sucesso}
            </p>
          )}

          <p className="contact-note">
            Usaremos os dados informados para atender à sua solicitação.
            Consulte nossa{" "}
            <Link href="/privacidade" target="_blank" rel="noopener noreferrer">
              Política de Privacidade
            </Link>.
          </p>

          <ContactTurnstile
            key={turnstileVersion}
            onToken={setTurnstileToken}
          />

          <button
            className="auth-submit"
            type="submit"
            disabled={enviando || !turnstileToken}
          >
            {enviando ? "Enviando mensagem…" : "Enviar mensagem"}
          </button>
        </form>

        <div className="auth-switch">
          <p>Prefere enviar pelo seu e-mail?</p>
          <a href="mailto:marcio.breves@gmail.com?subject=Contato%20Homenageando">
            Abrir meu aplicativo de e-mail
          </a>
          <p className="contact-email-address">marcio.breves@gmail.com</p>
        </div>
      </div>
    </section>
  );
}