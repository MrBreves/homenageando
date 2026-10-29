
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";
import { supabase } from "@/lib/supabase";

export default function MinhaContaPage() {
  const router = useRouter();

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [userId, setUserId] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [celular1, setCelular1] = useState("");
  const [celular2, setCelular2] = useState("");
  const [paisCelular1, setPaisCelular1] = useState<CountryCode>("BR");
  const [paisCelular2, setPaisCelular2] = useState<CountryCode>("BR");

  const paises = getCountries();

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [confirmacaoExclusao, setConfirmacaoExclusao] = useState("");
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState("");

  useEffect(() => {
    let ativo = true;

    async function carregarPerfil() {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (!ativo) return;

        if (error || !data.user) {
          router.replace("/entrar");
          return;
        }

        const usuario = data.user;

        setUserId(usuario.id);
        setEmail(usuario.email ?? "");
        setNome(
          usuario.user_metadata?.nome ??
          usuario.user_metadata?.full_name ??
          usuario.user_metadata?.name ??
          ""
        );

        const { data: perfil, error: erroPerfil } = await supabase
          .from("profiles")
          .select("celular_1, celular_2")
          .eq("id", usuario.id)
          .maybeSingle();

        if (!ativo) return;

        if (erroPerfil) {
          throw erroPerfil;
        }

        const telefoneSalvo = perfil?.celular_1 ?? "";
        const telefoneInterpretado = telefoneSalvo
          ? parsePhoneNumberFromString(telefoneSalvo)
          : undefined;

        setPaisCelular1(telefoneInterpretado?.country ?? "BR");
        setCelular1(
          telefoneInterpretado?.formatNational() ?? telefoneSalvo
        );

        const telefone2Salvo = perfil?.celular_2 ?? "";
        const telefone2Interpretado = telefone2Salvo
          ? parsePhoneNumberFromString(telefone2Salvo, "BR")
          : undefined;

        setPaisCelular2(telefone2Interpretado?.country ?? "BR");
        setCelular2(
          telefone2Interpretado?.formatNational() ?? telefone2Salvo
        );
      } catch {
        if (ativo) {
          setErro("Não foi possível carregar seus dados.");
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    carregarPerfil();

    return () => {
      ativo = false;
    };
  }, [router]);

  async function salvarPerfil(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (salvando || !userId) return;

    setSalvando(true);
    setErro("");
    setSucesso("");

    try {
      const nomeLimpo = nome.trim();

      if (!nomeLimpo) {
        setErro("Informe seu nome.");
        return;
      }

      const { data: autenticacao, error: erroUsuario } =
        await supabase.auth.getUser();

      if (
        erroUsuario ||
        !autenticacao.user ||
        autenticacao.user.id !== userId
      ) {
        router.replace("/entrar");
        return;
      }

      const telefone1 = celular1.trim()
        ? parsePhoneNumberFromString(celular1, paisCelular1)
        : undefined;

      if (celular1.trim() && (!telefone1 || !telefone1.isValid())) {
        setErro("Informe um telefone 1 válido para o país selecionado.");
        return;
      }

      const telefone2 = celular2.trim()
        ? parsePhoneNumberFromString(celular2, paisCelular2)
        : undefined;

      if (celular2.trim() && (!telefone2 || !telefone2.isValid())) {
        setErro("Informe um telefone válido para o país selecionado.");
        return;
      }

      const { error: erroPerfil } = await supabase
        .from("profiles")
        .upsert(
          {
            id: userId,
            celular_1: telefone1?.number ?? null,
            celular_2: telefone2?.number ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

      if (erroPerfil) {
        throw erroPerfil;
      }

      const { error: erroNome } = await supabase.auth.updateUser({
        data: {
          nome: nomeLimpo,
        },
      });

      if (erroNome) {
        throw erroNome;
      }

      setNome(nomeLimpo);
      setSucesso("Dados atualizados com sucesso.");
    } catch {
      setErro("Não foi possível salvar todos os dados. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluirConta() {
    if (excluindo || confirmacaoExclusao !== "EXCLUIR") return;

    setExcluindo(true);
    setErroExclusao("");

    try {
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        setErroExclusao("Sua sessão expirou. Entre novamente.");
        return;
      }

      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({ confirmacao: "EXCLUIR" }),
      });

      const resultado = await response.json();

      if (!response.ok) {
        setErroExclusao(
          resultado.error ?? "Não foi possível excluir a conta."
        );
        return;
      }

      if (
        resultado.ok !== true ||
        typeof resultado.requestId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          resultado.requestId
        )
      ) {
        setErroExclusao(
          "Resposta inesperada. Consulte o atendimento antes de tentar novamente."
        );
        return;
      }

      try {
        localStorage.removeItem("homenageando_questionnaire");
        localStorage.removeItem("homenageando_questionnaire_step");
        localStorage.removeItem("homenageando_preview_auth_pending");
        sessionStorage.removeItem("homenageando_login_return");

        sessionStorage.setItem(
          "homenageando_deletion_protocol",
          resultado.requestId
        );

        sessionStorage.setItem(
          "homenageando_deletion_email_sent",
          resultado.emailSent === true ? "true" : "false"
        );
      } catch {
        // O navegador pode bloquear armazenamento local.
      }

      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        // A exclusão pode ter invalidado a sessão no servidor.
      }

      window.location.replace(
        "/exclusao-de-dados/status#" +
          encodeURIComponent(resultado.requestId)
      );

    } catch {
      setErroExclusao("Erro de comunicação. Tente novamente.");
    } finally {
      setExcluindo(false);
    }
  }

  if (carregando) {
    return (
      <section className="auth-page">
        <div className="auth-card">
          <p>Carregando seus dados...</p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="auth-page minha-conta-compacta"
      aria-labelledby="minha-conta-title"
    >
      <style jsx global>{`
        .minha-conta-compacta .auth-card {
          padding-top: 28px;
          padding-bottom: 28px;
        }

        .minha-conta-compacta .auth-heading {
          margin-bottom: 18px;
        }

        .minha-conta-compacta .auth-form {
          gap: 12px;
        }

        .minha-conta-compacta .auth-field {
          gap: 5px;
        }

        .minha-conta-compacta .auth-field input {
          min-height: 44px;
          height: 44px;
          padding: 9px 14px;
        }

        .minha-conta-compacta .auth-submit,
        .minha-conta-compacta .auth-cancel-button {
          flex: 1;
          width: 100%;
          min-width: 0;
          min-height: 48px;
          margin: 0;
        }

        .minha-conta-compacta .conta-botoes {
          display: flex;
          gap: 12px;
          width: 100%;
        }

        @media (max-width: 420px) {
          .minha-conta-compacta .conta-botoes {
            gap: 8px;
          }

          .minha-conta-compacta .conta-botoes button {
            font-size: 13px;
            padding-inline: 8px;
          }
        }

        .minha-conta-compacta .auth-switch {
          margin-top: 20px;
          padding-top: 20px;
        }

        .minha-conta-compacta .conta-telefone-linha {
          display: flex;
          align-items: stretch;
          gap: 8px;
          width: 100%;
        }

        .minha-conta-compacta .conta-telefone-linha select {
          flex: 0 0 120px;
          width: 120px;
          min-width: 0;
          height: 44px;
          padding: 0 6px;
          border: 1px solid #d7b99c;
          border-radius: 10px;
          background: #fff;
          color: #2b1b13;
          font-size: 13px;
        }

        .minha-conta-compacta .conta-telefone-linha input {
          flex: 1;
          min-width: 0;
          width: 100%;
        }
      `}</style>
      <div className="auth-card">
        <header className="auth-heading">
          <span className="auth-decoration" aria-hidden="true">♡</span>
          <h1 id="minha-conta-title">Minha conta</h1>
          <p>Consulte e atualize suas informações pessoais.</p>
        </header>

        <form
          className="auth-form"
          onSubmit={salvarPerfil}
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
              required
            />
          </label>

          <label className="auth-field">
            <span>E-mail</span>
            <input
              type="email"
              name="email"
              value={email}
              readOnly
              title="O e-mail está vinculado à sua autenticação."
            />
          </label>

          <div className="auth-field">
            <label htmlFor="celular1">Celular (opcional)</label>

            <div className="conta-telefone-linha">
              <select
                aria-label="País do telefone 1"
                value={paisCelular1}
                onChange={(event) => {
                  setPaisCelular1(event.target.value as CountryCode);
                  setCelular1("");
                }}
              >
                {paises.map((pais) => (
                  <option key={pais} value={pais}>
                    {pais} (+{getCountryCallingCode(pais)})
                  </option>
                ))}
              </select>

              <input
                id="celular1"
                type="tel"
                name="celular1"
                autoComplete="tel-national"
                placeholder="(XX) XXXXX-XXXX"
                value={celular1}
                onChange={(event) => {
                  setCelular1(
                    new AsYouType(paisCelular1).input(event.target.value)
                  );
                }}
                maxLength={25}
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="celular2">Telefone (opcional)</label>

            <div className="conta-telefone-linha">
              <select
                aria-label="País do telefone adicional"
                value={paisCelular2}
                onChange={(event) => {
                  setPaisCelular2(event.target.value as CountryCode);
                  setCelular2("");
                }}
              >
                {paises.map((pais) => (
                  <option key={pais} value={pais}>
                    {pais} (+{getCountryCallingCode(pais)})
                  </option>
                ))}
              </select>

              <input
                id="celular2"
                type="tel"
                name="celular2"
                autoComplete="tel-national"
                placeholder={
                  paisCelular2 === "BR"
                    ? "(XX) XXXX-XXXX"
                    : "Número de telefone"
                }
                value={celular2}
                onChange={(event) => {
                  setCelular2(
                    new AsYouType(paisCelular2).input(event.target.value)
                  );
                }}
                maxLength={25}
              />
            </div>
          </div>

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

          <div className="conta-botoes">
            <button
              className="auth-submit"
              type="submit"
              disabled={salvando}
            >
              {salvando ? "Salvando..." : "Salvar alterações"}
            </button>

            <button
              className="auth-cancel-button"
              type="button"
              disabled={salvando}
              onClick={() => router.replace("/")}
            >
              Sair sem alterar
            </button>
          </div>
        </form>


        <div className="auth-switch">
          <p>Deseja encerrar sua conta?</p>

          <details className="conta-exclusao">
            <summary
              style={{
                cursor: "pointer",
                color: "#9b3030",
                fontWeight: 600,
              }}
            >
              Excluir minha conta
            </summary>

            <div
              style={{
                marginTop: 16,
                padding: 16,
                border: "1px solid #e6c5c5",
                borderRadius: 12,
                background: "#fff8f7",
                textAlign: "left",
              }}
            >
              <p style={{ fontWeight: 700, color: "#842b2b" }}>
                Atenção: exclusão permanente
              </p>

              <p style={{ marginTop: 10, lineHeight: 1.5 }}>
                A exclusão é irreversível: encerra seu acesso e remove seu cadastro,
                questionários, músicas, previews, letras e arquivos pessoais.
                Baixe antes os arquivos que deseja guardar. Registros comerciais
                estritamente necessários poderão permanecer com acesso restrito
                pelo prazo legal aplicável, sem manter o conteúdo da homenagem.
                A exclusão não solicita automaticamente um reembolso.
              </p>

              <p style={{ marginTop: 12, fontSize: 13 }}>
                Sua sessão será validada pelo servidor. A solicitação bloqueará
                novos pedidos e gerações. Você receberá um protocolo para acompanhar
                a conclusão ou eventual pendência. Um novo cadastro não recupera
                o conteúdo excluído. <a href="/exclusao-de-dados">Leia as instruções</a>.
              </p>

              <label
                htmlFor="confirmacao-exclusao"
                style={{
                  display: "block",
                  marginTop: 14,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Digite EXCLUIR para confirmar sua intenção:
              </label>

              <input
                id="confirmacao-exclusao"
                type="text"
                placeholder="EXCLUIR"
                autoComplete="off"
                spellCheck={false}
                value={confirmacaoExclusao}
                onChange={(event) => {
                  setConfirmacaoExclusao(event.target.value);
                  setErroExclusao("");
                }}
                style={{
                  width: "100%",
                  marginTop: 8,
                  padding: 12,
                  border: "1px solid #e6c5c5",
                  borderRadius: 10,
                }}
              />

              {erroExclusao && (
                <p role="alert" style={{ color: "#9b3030", marginTop: 10 }}>
                  {erroExclusao}
                </p>
              )}

              <button
                type="button"
                disabled={excluindo || confirmacaoExclusao !== "EXCLUIR"}
                onClick={excluirConta}
                style={{
                  width: "100%",
                  marginTop: 16,
                  padding: 12,
                  borderRadius: 10,
                  background:
                    confirmacaoExclusao === "EXCLUIR"
                      ? "#9b3030"
                      : "#dddddd",
                  color:
                    confirmacaoExclusao === "EXCLUIR"
                      ? "#ffffff"
                      : "#666666",
                }}
              >
                Confirmar exclusão permanente
              </button>
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}
