
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

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (carregando) {
      return;
    }

    setErro("");
    setCarregando(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });

      if (error) {
        setErro("E-mail ou senha inválidos.");
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
