"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";


export default function CadastroPage() {
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
  const [aceitouTermos, setAceitouTermos] = useState(false);

  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(false);

  const requisitosSenha = [
    {
      id: "tamanho",
      texto: "Pelo menos 8 caracteres",
      atendido: senha.length >= 8,
    },
    {
      id: "maiuscula",
      texto: "Uma letra maiúscula (A–Z)",
      atendido: /[A-Z]/.test(senha),
    },
    {
      id: "minuscula",
      texto: "Uma letra minúscula (a–z)",
      atendido: /[a-z]/.test(senha),
    },
    {
      id: "numero",
      texto: "Um número (0–9)",
      atendido: /[0-9]/.test(senha),
    },
    {
      id: "simbolo",
      texto: "Um símbolo, como !, @, # ou %",
      atendido: /[!@#$%^&*()_+\-=\[\]{};':"\\|<>?,./`~]/.test(senha),
    },
  ];

  const senhaValida = requisitosSenha.every(
    (requisito) => requisito.atendido,
  );

  const senhasCoincidem =
    confirmarSenha.length > 0 && senha === confirmarSenha;

  async function handleCadastro(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (carregando) {
      return;
    }

    setErro("");
    setMensagem("");

    if (!nome.trim()) {
      setErro("Informe seu nome.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErro("Informe um e-mail válido, como nome@exemplo.com.");
      return;
    }

    if (!senhaValida) {
      setErro("Sua senha precisa atender a todos os requisitos indicados.");
      return;
    }

    if (!senhasCoincidem) {
      setErro("A confirmação precisa ser igual à senha.");
      return;
    }

    if (!aceitouTermos) {
      setErro("Você precisa aceitar os termos para criar sua conta.");
      return;
    }

    setCarregando(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          nome: nome.trim(),
          aceitou_termos: true,
          aceitou_termos_em: new Date().toISOString(),
        },
      },
    });

    setCarregando(false);

    if (error) {
      setErro(error.message);
      return;
    }

    if (data.session) {
      sessionStorage.removeItem("homenageando_login_return");
      router.replace("/#inicio");
      return;
    }

    setMensagem(
      "Cadastro realizado. Verifique seu e-mail para confirmar sua conta.",
    );

    setTimeout(() => {
      router.push("/entrar");
    }, 3000);
  }

  return (
    <section className="auth-page" aria-labelledby="cadastro-title">
      <div className="auth-card">
        <header className="auth-heading">
          <span className="auth-decoration" aria-hidden="true">♡</span>
          <h1 id="cadastro-title">Crie sua conta</h1>
          <p>Um passo para transformar sua história em música.</p>

        </header>

        <form
          className="auth-form"
          onSubmit={handleCadastro}
          aria-busy={carregando}
        >

          <label className="auth-field">
            <span>Nome</span>
            <input
              type="text"
              name="nome"
              autoComplete="name"
              placeholder="Como você se chama?"
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              required
            />
          </label>

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

          <div className="auth-password-group">
            <div className="auth-field">
              <label htmlFor="cadastro-senha">Senha</label>
              <div className="auth-password-input">
                <input
                  id="cadastro-senha"
                  type={mostrarSenha ? "text" : "password"}
                  name="senha"
                  autoComplete="new-password"
                  placeholder="Crie sua senha"
                  value={senha}
                  onChange={(event) => setSenha(event.target.value)}
                  minLength={8}
                  aria-describedby="requisitos-senha"
                  required
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                  aria-controls="cadastro-senha"
                  onClick={() => setMostrarSenha((atual) => !atual)}
                >
                  {mostrarSenha ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </div>

            <div className="auth-password-rules" id="requisitos-senha">
              <p>Sua senha deve conter:</p>
              <ul>
                {requisitosSenha.map((requisito) => (
                  <li
                    key={requisito.id}
                    className={
                      requisito.atendido
                        ? "auth-rule is-complete"
                        : "auth-rule"
                    }
                  >
                    <span className="auth-rule-icon" aria-hidden="true">
                      {requisito.atendido ? "✓" : "○"}
                    </span>
                    <span>
                      {requisito.texto}
                      <span className="auth-visually-hidden">
                        {requisito.atendido
                          ? " — atendido"
                          : " — pendente"}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="auth-password-group">
            <div className="auth-field">
              <label htmlFor="cadastro-confirmar-senha">
                Confirmar senha
              </label>
              <div className="auth-password-input">
                <input
                  id="cadastro-confirmar-senha"
                  type={mostrarConfirmacao ? "text" : "password"}
                  name="confirmarSenha"
                  autoComplete="new-password"
                  placeholder="Repita sua senha"
                  value={confirmarSenha}
                  onChange={(event) => setConfirmarSenha(event.target.value)}
                  aria-describedby="confirmacao-senha"
                  aria-invalid={
                    confirmarSenha.length > 0 && !senhasCoincidem
                  }
                  required
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  aria-label={
                    mostrarConfirmacao
                      ? "Ocultar confirmação da senha"
                      : "Mostrar confirmação da senha"
                  }
                  aria-controls="cadastro-confirmar-senha"
                  onClick={() => setMostrarConfirmacao((atual) => !atual)}
                >
                  {mostrarConfirmacao ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </div>

            <p
              id="confirmacao-senha"
              className={
                senhasCoincidem
                  ? "auth-password-match is-complete"
                  : "auth-password-match"
              }
              role="status"
            >
              <span aria-hidden="true">
                {senhasCoincidem ? "✓" : "○"}
              </span>
              {senhasCoincidem
                ? "As senhas coincidem."
                : confirmarSenha.length > 0
                  ? "As senhas ainda não coincidem."
                  : "Repita a senha para confirmar."}
            </p>
          </div>

          <div className="auth-consent">
            <label className="auth-terms">
              <input
                type="checkbox"
                checked={aceitouTermos}
                onChange={(event) =>
                  setAceitouTermos(event.target.checked)
                }
                aria-describedby="cadastro-documentos"
                required
              />
              <span>
                Aceito os Termos de Uso e declaro que li a Política
                de Privacidade.
              </span>
            </label>

            <p id="cadastro-documentos" className="auth-legal-links">
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

          {mensagem && (
            <p className="auth-message auth-message-success" role="status">
              {mensagem}
            </p>
          )}

          <button
            className="auth-submit"
            type="submit"
            disabled={carregando}
          >
            {carregando ? "Criando conta..." : "Criar conta"}
          </button>
        </form>

        <p className="auth-switch">
          Já tem conta? <a href="/entrar">Entrar na minha conta</a>
        </p>
      </div>
    </section>
  );
}