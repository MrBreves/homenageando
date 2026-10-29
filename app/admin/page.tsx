
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabase";
import styles from "./page.module.css";

type Indicadores = {
  totalPedidos: number;
  questionariosAbertos: number;
  emGeracao: number;
  musicasAbandonadas: number;
  pagamentosPendentes: number;
  musicasEntregues: number;
};

type RespostaAdmin = {
  success: boolean;
  error?: string;
  indicadores?: Indicadores;
};

const secoes = [
  {
    nome: "Pedidos",
    href: "/admin/pedidos",
    descricao: "OS, andamento, pagamentos e finalizações.",
  },
  {
    nome: "Músicas",
    href: "/admin/musicas",
    descricao: "Títulos, arquivos, geração e compradores.",
  },
  {
    nome: "Clientes",
    href: "/admin/clientes",
    descricao: "Dados de contato e histórico de compras.",
  },
  {
    nome: "Financeiro",
    href: "/admin/financeiro",
    descricao: "Receita real, simulações e descontos.",
  },
  {
    nome: "Cupons",
    href: "/admin/cupons",
    descricao: "Cupons aplicados, descontos e cortesias.",
  },
  {
    nome: "Recuperação",
    href: "/admin/recuperacao",
    descricao: "Músicas abandonadas e ações de recuperação.",
  },
  {
    nome: "Configurações",
    href: "/admin/configuracoes",
    descricao: "Parâmetros administrativos do negócio.",
  },
];

export default function AdminPage() {
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState("");
  const [indicadores, setIndicadores] =
    useState<Indicadores | null>(null);

  const carregarPainel = useCallback(async () => {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        setIndicadores(null);
        setErro("Faça login para acessar o painel.");
        return;
      }

      const resposta = await fetch("/api/admin/overview", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      const dados: RespostaAdmin = await resposta.json();

      if (!resposta.ok || !dados.success || !dados.indicadores) {
        throw new Error(
          dados.error ?? "Não foi possível carregar o painel."
        );
      }

      setIndicadores(dados.indicadores);
      setErro("");
    } catch (error) {
      setIndicadores(null);
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o painel."
      );
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void carregarPainel();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [carregarPainel]);

  function atualizar() {
    setAtualizando(true);
    void carregarPainel().finally(() => {
      setAtualizando(false);
    });
  }

  const cards = indicadores
    ? [
        {
          titulo: "Pedidos registrados",
          valor: indicadores.totalPedidos,
        },
        {
          titulo: "Músicas entregues",
          valor: indicadores.musicasEntregues,
        },
        {
          titulo: "Músicas abandonadas",
          valor: indicadores.musicasAbandonadas,
          destaque: true,
        },
        {
          titulo: "Pagamentos pendentes",
          valor: indicadores.pagamentosPendentes,
        },
        {
          titulo: "Em geração",
          valor: indicadores.emGeracao,
        },
        {
          titulo: "Questionários abertos",
          valor: indicadores.questionariosAbertos,
        },
      ]
    : [];

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>HOMENAGEANDO</p>
            <h1 className={styles.title}>
              Painel administrativo
            </h1>
            <p className={styles.subtitle}>
              Visão geral do negócio e áreas de gerenciamento.
            </p>
          </div>

          <div className={styles.headerActions}>
            <Link
              className={styles.backLink}
              href="/#inicio"
              scroll={true}
              onClick={() => {
                window.history.scrollRestoration = "manual";
                window.scrollTo(0, 0);
              }}
            >
              Voltar ao site
            </Link>

            <button
              type="button"
              className={styles.refreshButton}
              onClick={atualizar}
              disabled={carregando || atualizando}
            >
              {atualizando ? "Atualizando..." : "Atualizar"}
            </button>
          </div>
        </header>

        {carregando && (
          <p className={styles.message}>
            Carregando indicadores...
          </p>
        )}

        {!carregando && erro && (
          <section className={styles.errorBox} role="alert">
            <p>{erro}</p>

            {erro === "Faça login para acessar o painel." && (
              <Link href="/entrar">
                Ir para o login
              </Link>
            )}
          </section>
        )}

        {!carregando && indicadores && (
          <>
            <section aria-labelledby="indicadores-title">
              <div className={styles.dashboardHeading}>
                <h2 id="indicadores-title">Indicadores</h2>
                <p>Dados atuais do Supabase.</p>
              </div>

              <div className={styles.statsGrid}>
                {cards.map((card) => (
                  <article
                    key={card.titulo}
                    className={`${styles.statCard} ${
                      card.destaque ? styles.abandonedCard : ""
                    }`}
                  >
                    <span>{card.titulo}</span>
                    <strong>{card.valor}</strong>
                  </article>
                ))}
              </div>
            </section>

            <section
              className={styles.managementSection}
              aria-labelledby="gerenciamento-title"
            >
              <div className={styles.dashboardHeading}>
                <h2 id="gerenciamento-title">
                  Áreas de gerenciamento
                </h2>
                <p>
                  Consultas organizadas por assunto, com dados
                  compartilhados entre os painéis.
                </p>
              </div>

              <div className={styles.managementGrid}>
                {secoes.map((secao) => (
                  <Link
                    key={secao.nome}
                    href={secao.href}
                    className={styles.managementCard}
                    style={{
                      display: "block",
                      textDecoration: "none",
                      cursor: "pointer",
                    }}
                  >
                    <div className={styles.managementCardTop}>
                      <h3>{secao.nome}</h3>
                    </div>

                    <p>{secao.descricao}</p>
                  </Link>
                ))}
              </div>
            </section>

            <p className={styles.note}>
              As informações de pagamentos de teste não serão
              contabilizadas como receita real. A área financeira
              terá essa separação quando for implementada.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
