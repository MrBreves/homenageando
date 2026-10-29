"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

export default function Header() {
  const router = useRouter();

  const [nomeUsuario, setNomeUsuario] = useState<string | null>(null);
  const [logado, setLogado] = useState(false);
  const [ehAdmin, setEhAdmin] = useState(false);
  const [tokenAdmin, setTokenAdmin] = useState<string | null>(null);
  const [menuAberto, setMenuAberto] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuAberto) return;

    function fecharComEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuAberto(false);
        menuButtonRef.current?.focus();
      }
    }

    document.addEventListener("keydown", fecharComEscape);
    return () => document.removeEventListener("keydown", fecharComEscape);
  }, [menuAberto]);

  useEffect(() => {
    async function carregarUsuario() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLogado(false);
        setNomeUsuario(null);
        return;
      }

      setLogado(true);
      setNomeUsuario(user.user_metadata?.nome ?? "Minha conta");
    }

    carregarUsuario();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;

      if (!user) {
        setLogado(false);
        setNomeUsuario(null);
        setEhAdmin(false);
        setTokenAdmin(null);
        return;
      }

      setLogado(true);
      setNomeUsuario(user.user_metadata?.nome ?? "Minha conta");
      setTokenAdmin(session?.access_token ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelado = false;

    async function consultarAcessoAdmin() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (cancelado) return;

        if (!session?.access_token) {
          setEhAdmin(false);
          return;
        }

        const resposta = await fetch("/api/admin/access", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        });

        if (!resposta.ok) {
          if (!cancelado) setEhAdmin(false);
          return;
        }

        const dados: { isAdmin?: boolean } =
          await resposta.json();

        if (!cancelado) {
          setEhAdmin(dados.isAdmin === true);
        }
      } catch {
        if (!cancelado) {
          setEhAdmin(false);
        }
      }
    }

    const timeoutId = window.setTimeout(() => {
      void consultarAcessoAdmin();
    }, 0);

    return () => {
      cancelado = true;
      window.clearTimeout(timeoutId);
    };
  }, [logado, tokenAdmin]);

  async function handleSair() {
    setMenuAberto(false);

    const { error } = await supabase.auth.signOut();

    if (error) {
      window.alert("Não foi possível sair. Tente novamente.");
      return;
    }

    setLogado(false);
    setNomeUsuario(null);
    setEhAdmin(false);
    setTokenAdmin(null);

    if (window.location.pathname === "/") {
      window.history.replaceState(
        window.history.state,
        "",
        "/#inicio"
      );

      window.scrollTo({
        top: 0,
        behavior: "instant",
      });

      router.refresh();
      return;
    }

    window.location.replace("/#inicio");
  }

  return (
    <header className="site-header">
      <div className="header-content">
        <Link
          href="/#inicio"
          className="brand"
          onClick={(event) => {
            setMenuAberto(false);

            if (
              window.location.pathname === "/" &&
              !event.ctrlKey &&
              !event.metaKey &&
              !event.shiftKey &&
              !event.altKey
            ) {
              event.preventDefault();
              window.history.replaceState(null, "", "/#inicio");
              window.scrollTo({
                top: 0,
                behavior: "instant",
              });
            }
          }}
          aria-label="Homenageando — início"
        >
          <Image
            src="/images/logo.webp"
            alt="Homenageando"
            width={2095}
            height={499}
            className="brand-name"
            sizes="(max-width: 479px) 184px, (max-width: 1023px) 208px, (max-width: 1439px) 216px, 240px"
            priority
          />
        </Link>

        <div className="header-account">
          {logado ? (
            <span className="header-user" title={`Olá, ${nomeUsuario}`}>
              Olá, {nomeUsuario}
            </span>
          ) : (
            <Link
              href="/entrar"
              className="header-login"
              onClick={() => {
                sessionStorage.setItem(
                  "homenageando_login_return",
                  window.location.pathname +
                    window.location.search +
                    window.location.hash
                );
                setMenuAberto(false);
              }}
            >
              Entrar
            </Link>
          )}
          {logado && ehAdmin && (
            <Link
              href="/admin"
              className="header-admin-button"
              title="Painel administrativo"
              onClick={() => setMenuAberto(false)}
            >
              Admin
            </Link>
          )}
          <button
            ref={menuButtonRef}
            type="button"
            className="header-menu-toggle"
            aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuAberto}
            aria-controls="header-navigation"
            onClick={() => setMenuAberto((aberto) => !aberto)}
          >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>
        </div>

        <nav
          id="header-navigation"
          className={`header-actions${menuAberto ? " is-open" : ""}`}
          aria-label="Navegação principal"
        >
          <Link
            href="/#fim-como-funciona"
            className="header-link"
            onClick={(event) => {
              setMenuAberto(false);

              const mobile = window.matchMedia("(max-width: 599px)").matches;
              const destinoId = mobile ? "como-funciona" : "fim-como-funciona";
              const destino = document.getElementById(destinoId);

              event.preventDefault();

              if (destino) {
                destino.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              } else {
                router.push(`/#${destinoId}`);
              }
            }}
          >
            Como funciona
          </Link>
          <Link
            href={logado ? "/minhas-musicas" : "/entrar"}
            className="header-link"
            onClick={() => setMenuAberto(false)}
          >
            Minhas músicas
          </Link>
          <Link
            href={logado ? "/minha-conta" : "/entrar"}
            className="header-link"
            onClick={() => setMenuAberto(false)}
          >
            Minha conta
          </Link>
          <Link
            href="/contato"
            className="header-link"
            onClick={() => setMenuAberto(false)}
          >
            Contato
          </Link>
          <Link
            href="/faq"
            className="header-link"
            aria-label="FAQ — Perguntas frequentes"
            onClick={() => setMenuAberto(false)}
          >
            FAQ
          </Link>
          {logado && (
            <button type="button" className="header-login" onClick={handleSair}>
              Sair
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
