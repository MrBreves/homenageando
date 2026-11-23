
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import GoogleLoginButton from "@/components/GoogleLoginButton";



export default function EntrarPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [emailNaoConfirmado, setEmailNaoConfirmado] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [aviso, setAviso] = useState("");

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (carregando) {
      return;
    }

    setErro("");
    setAviso("");
    setEmailNaoConfirmado(false);
    setCarregando(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });

      if (error) {
        if (error.code === "email_not_confirmed") {
          setEmailNaoConfirmado(true);
          setErro("Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada, Spam ou Lixo Eletrônico. Se necessário, use o botão abaixo para solicitar outro link de confirmação. Não é necessário fazer novo cadastro.");
        } else {
          setErro("E-mail ou senha inválidos.");
        }
        return;
      }

      sessionStorage.removeItem("homenageando_login_return");
      router.replace("/#inicio");
    } catch {
      setErro("Não foi possível entrar. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  async function handleReenviarConfirmacao() {
    if (reenviando || !email.trim()) return;
    setErro("");
    setAviso("");
    setReenviando(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setErro(error.status === 429 ? "Muitas solicitações. Aguarde alguns minutos antes de tentar novamente." : "Não foi possível solicitar o e-mail. Entre em contato com o suporte se o problema continuar.");
        return;
      }
      setAviso("Se a conta estiver aguardando confirmação, um novo link será enviado. Confira também Spam e Lixo eletrônico.");
    } catch {
      setErro("Não foi possível solicitar o reenvio. Tente novamente.");
    } finally {
      setReenviando(false);
    }
  }

  return (
    <section className="auth-page auth-social-page" aria-labelledby="entrar-title">
      <div className="auth-card">
        <header className="auth-heading">
          <span className="auth-decoration" aria-hidden="true">♡</span>
          <h1 id="entrar-title">Que bom ter você aqui</h1>
          <p>Entre na sua conta para continuar sua homenagem.</p>
        </header>

        <div className="auth-social-buttons">
          <GoogleLoginButton
            disabled={carregando}
            onBusyChange={setCarregando}
          />
         
        </div>

        <p className="auth-divider">ou continue com e-mail</p>

        <form
          className="auth-form"
          onSubmit={handleLogin}
          aria-busy={carregando}
        >
          <label className="auth-field">
            <span>E-mail</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              placeholder="Seu e-mail"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <div className="auth-field">
            <label htmlFor="entrar-senha">Senha</label>
            <div className="auth-password-input">
              <input
                id="entrar-senha"
                type={mostrarSenha ? "text" : "password"}
                name="senha"
                autoComplete="current-password"
                placeholder="Sua senha"
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                required
              />
              <button
                type="button"
                className="auth-password-toggle"
                aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                aria-controls="entrar-senha"
                onClick={() => setMostrarSenha((atual) => !atual)}
              >
                {mostrarSenha ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </div>

          {erro && (
            <p className="auth-message auth-message-error" role="alert">
              {erro}
            </p>
          )}
          {aviso && <p className="auth-message auth-message-success" role="status">{aviso}</p>}
          {emailNaoConfirmado && (
            <button className="auth-submit" type="button" disabled={reenviando || carregando} onClick={handleReenviarConfirmacao}>
              {reenviando ? "Solicitando reenvio..." : "Reenviar e-mail de confirmação"}
            </button>
          )}

          <button
            className="auth-submit"
            type="submit"
            disabled={carregando}
          >
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="auth-switch">
          Ainda não tem conta? <a href="/cadastro">Criar minha conta</a>
        </p>
      </div>
    </section>
  );
}
