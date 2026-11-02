"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { supabase } from "@/lib/supabase";
import styles from "../page.module.css";

type Pedido = {
  id: string;
  user_id: string;
  os_number: number | null;
  titulo: string;
  cliente_nome: string;
  cliente_email: string | null;
  celular_1: string | null;
  celular_2: string | null;
  state: string;
  payment_status: string | null;
  payment_provider: string | null;
  payment_amount_cents: number | null;
  original_amount_cents: number | null;
  discount_amount_cents: number | null;
  applied_coupon_code: string | null;
  created_at: string;
  updated_at: string;
  payment_approved_at: string | null;
  music_1_storage_path: string | null;
  preview_1_storage_path: string | null;
  abandonada: boolean;
  admin_grant: {
    order_id: string;
    grant_mode: "KEEP_CHARGE" | "WAIVE_BALANCE";
    granted_at: string;
    original_due_cents: number;
    waived_cents: number;
  } | null;
};

type Resposta = {
  success: boolean;
  error?: string;
  pedidos?: Pedido[];
};

const titulos: Record<string, string> = {
  pedidos: "Pedidos",
  musicas: "Músicas",
  clientes: "Clientes",
  financeiro: "Financeiro",
  cupons: "Cupons",
  recuperacao: "Recuperação de vendas",
  configuracoes: "Configurações",
};

function moeda(centavos: number | null | undefined) {
  if (centavos == null) return "—";

  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function data(valor: string | null | undefined) {
  if (!valor) return "—";

  const d = new Date(valor);

  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("pt-BR");
}

function status(p: Pedido) {
  if (p.admin_grant?.grant_mode === "WAIVE_BALANCE") {
    return "Liberada - cobrança dispensada";
  }

  if (p.admin_grant?.grant_mode === "KEEP_CHARGE") {
    return "Liberada - cobrança mantida";
  }

  if (p.abandonada) return "Abandonada";
  if (p.state === "QUESTIONÁRIO_ABERTO") return "Em elaboração";
  if (p.state === "GERANDO_MUSICA_1") return "Em geração";
  if (p.payment_status === "PENDING") return "Pagamento pendente";
  if (p.payment_status === "APPROVED") {
    return p.payment_provider === "TEST"
      ? "Aprovado (teste)"
      : p.payment_provider === "COUPON_100"
        ? "Cortesia"
        : "Pagamento aprovado";
  }
  if (p.state === "MUSICA_1_PREVIEW") return "Preview pronto";
  return p.state.replaceAll("_", " ");
}

export default function SecaoAdminPage() {
  const params = useParams<{ secao: string }>();
  const secao = params.secao;

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [operandoId, setOperandoId] = useState<string | null>(null);
  const [recarregar, setRecarregar] = useState(0);

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          throw new Error("Faça login para acessar o painel.");
        }

        const resposta = await fetch("/api/admin/dados", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        });

        const resultado: Resposta = await resposta.json();

        if (!resposta.ok || !resultado.success) {
          throw new Error(
            resultado.error ?? "Erro ao consultar o Supabase."
          );
        }

        if (!cancelado) {
          setPedidos(resultado.pedidos ?? []);
          setErro("");
        }
      } catch (error) {
        if (!cancelado) {
          setErro(
            error instanceof Error ? error.message : "Erro inesperado."
          );
        }
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }

    const timer = window.setTimeout(() => {
      void carregar();
    }, 0);

    return () => {
      cancelado = true;
      window.clearTimeout(timer);
    };
  }, [recarregar]);

  async function liberarMusica(
    pedido: Pedido,
    modalidade: "KEEP_CHARGE" | "WAIVE_BALANCE",
  ) {
    if (operandoId) return;

    const nomeModalidade =
      modalidade === "WAIVE_BALANCE"
        ? "LIBERAR E ZERAR A COBRANÇA"
        : "LIBERAR MANTENDO A COBRANÇA";

    const motivo = window.prompt(
      `OS ${pedido.os_number ?? "—"} - ${nomeModalidade}\n\nInforme a justificativa administrativa:`,
    );

    if (motivo === null) return;

    const justificativa = motivo.trim();

    if (!justificativa || justificativa.length > 500) {
      window.alert(
        "Informe uma justificativa de 1 a 500 caracteres.",
      );
      return;
    }

    const valor = moeda(pedido.payment_amount_cents);

    const detalhe =
      modalidade === "WAIVE_BALANCE"
        ? `O saldo informado na OS (${valor}) será dispensado. Não será registrado pagamento recebido.`
        : `A música será disponibilizada, mas o saldo informado na OS (${valor}) continuará devido.`;

    const confirmado = window.confirm(
      `CONFIRMAR OPERAÇÃO ADMINISTRATIVA\n\n` +
      `OS: ${pedido.os_number ?? "—"}\n` +
      `Música: ${pedido.titulo ?? "Título não cadastrado"}\n` +
      `Operação: ${nomeModalidade}\n\n` +
      `${detalhe}\n\n` +
      `Justificativa: ${justificativa}\n\n` +
      `Deseja executar esta operação?`,
    );

    if (!confirmado) return;

    setOperandoId(pedido.id);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Sessão expirada. Entre novamente.");
      }

      const resposta = await fetch("/api/admin/music-grant", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: pedido.id,
          mode: modalidade,
          reason: justificativa,
        }),
        cache: "no-store",
      });

      const resultado: {
        success?: boolean;
        error?: string;
        effectiveDueCents?: number;
      } = await resposta.json();

      if (!resposta.ok || resultado.success !== true) {
        throw new Error(
          resultado.error ?? "Operação administrativa recusada.",
        );
      }

      window.alert(
        `Operação registrada com sucesso.\n\n` +
        `OS ${pedido.os_number ?? "—"}\n` +
        `Saldo devido após a operação: ${moeda(resultado.effectiveDueCents)}`,
      );

      setCarregando(true);
      setErro("");
      setRecarregar((anterior) => anterior + 1);
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Erro ao registrar liberação administrativa.",
      );
    } finally {
      setOperandoId(null);
    }
  }

  if (!titulos[secao]) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <h1>Área não encontrada</h1>
          <Link href="/admin">Voltar ao painel</Link>
        </div>
      </main>
    );
  }

  const usuarioSelecionado =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("usuario")
      : null;

  const filtrados = pedidos.filter((p) => {
    if (secao === "clientes" && usuarioSelecionado) {
      if (p.user_id !== usuarioSelecionado) return false;
    }

    if (secao === "recuperacao" && !p.abandonada) return false;
    if (secao === "cupons" && !p.applied_coupon_code) return false;

    if (secao === "musicas") {
      if (
        !p.preview_1_storage_path &&
        !p.music_1_storage_path &&
        p.state !== "GERANDO_MUSICA_1"
      ) {
        return false;
      }
    }

    if (filtro === "abandonadas" && !p.abandonada) return false;
    if (filtro === "pagos" && p.payment_status !== "APPROVED") {
      return false;
    }
    if (filtro === "pendentes" && p.payment_status !== "PENDING") {
      return false;
    }
    if (
      filtro === "elaboracao" &&
      p.state !== "QUESTIONÁRIO_ABERTO"
    ) {
      return false;
    }

    const termo = busca.toLocaleLowerCase("pt-BR");
    const campos = [
      p.titulo,
      p.cliente_nome,
      p.cliente_email,
      p.celular_1,
      p.celular_2,
      p.os_number,
      p.applied_coupon_code,
    ];

    return campos.some((valor) =>
      String(valor ?? "").toLocaleLowerCase("pt-BR").includes(termo)
    );
  });

  const clientes = [...new Map(
    filtrados.map((p) => [p.user_id, p])
  ).values()];

  const aprovados = pedidos.filter(
    (p) => p.payment_status === "APPROVED"
  );

  const receitaReal = aprovados
    .filter(
      (p) =>
        p.payment_provider !== "TEST" &&
        p.payment_provider !== "COUPON_100" &&
        p.payment_provider !== "MERCADO_PAGO_TEST"
    )
    .reduce((total, p) => total + (p.payment_amount_cents ?? 0), 0);

  const descontos = aprovados.reduce(
    (total, p) => total + (p.discount_amount_cents ?? 0),
    0
  );

  const abandonadas = pedidos.filter((p) => p.abandonada);

  const receitaPotencial = abandonadas.reduce(
    (total, p) => total + (p.original_amount_cents ?? 3990),
    0
  );

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>HOMENAGEANDO / ADMIN</p>
            <h1 className={styles.title}>{titulos[secao]}</h1>
            <p className={styles.subtitle}>
              Consultas administrativas do Supabase
            </p>
          </div>
          <Link href="/admin" className={styles.backLink}>
            Voltar ao painel
          </Link>
        </header>

        {carregando && (
          <p className={styles.message}>Carregando dados...</p>
        )}

        {erro && (
          <section className={styles.errorBox} role="alert">
            {erro}
          </section>
        )}

        {!carregando && !erro && (
          <>
            {secao === "financeiro" && (
              <section className={styles.statsGrid}>
                {[
                  ["Receita real aprovada", moeda(receitaReal)],
                  ["Pagamentos aprovados", aprovados.length],
                  ["Descontos concedidos", moeda(descontos)],
                  [
                    "Cortesias",
                    aprovados.filter(
                      (p) => p.payment_provider === "COUPON_100"
                    ).length,
                  ],
                ].map(([nome, valor]) => (
                  <article key={nome} className={styles.statCard}>
                    <span>{nome}</span>
                    <strong>{valor}</strong>
                  </article>
                ))}
              </section>
            )}

            {secao === "recuperacao" && (
              <section className={styles.statsGrid}>
                <article className={styles.statCard}>
                  <span>Músicas abandonadas</span>
                  <strong>{abandonadas.length}</strong>
                </article>
                <article className={styles.statCard}>
                  <span>Receita potencial</span>
                  <strong>{moeda(receitaPotencial)}</strong>
                </article>
              </section>
            )}

            {secao === "configuracoes" ? (
              <section className={styles.managementCard}>
                <h2>Parâmetros comerciais</h2>
                <p>Preço público atual: R$ 39,90.</p>
                <p>
                  Configurações de pagamento, autenticação e geração
                  permanecem gerenciadas no servidor.
                </p>
                <p>
                  Esta área é de consulta. Nenhuma configuração pode
                  ser modificada por esta tela.
                </p>
              </section>
            ) : (
              <>
                <div style={{ marginBottom: 20, display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <input
                    type="search"
                    aria-label="Pesquisar registros"
                    placeholder="Pesquisar OS, música, cliente ou cupom"
                    value={busca}
                    onChange={(event) => setBusca(event.target.value)}
                    style={{
                      flex: "1 1 260px",
                      padding: 12,
                      border: "1px solid #d5bb98",
                      borderRadius: 10,
                      fontFamily: "inherit",
                    }}
                  />
                  <select
                    aria-label="Filtrar situação"
                    value={filtro}
                    onChange={(event) => setFiltro(event.target.value)}
                    style={{
                      padding: 12,
                      border: "1px solid #d5bb98",
                      borderRadius: 10,
                      background: "#fffdf9",
                    }}
                  >
                    <option value="todos">Todos</option>
                    <option value="elaboracao">Em elaboração</option>
                    <option value="abandonadas">Abandonadas</option>
                    <option value="pendentes">Pagamento pendente</option>
                    <option value="pagos">Pagos</option>
                  </select>
                </div>

                <section className={styles.ordersCard}>
                  <div className={styles.sectionHeader}>
                    <h2>
                      {secao === "clientes"
                        ? `Clientes (${clientes.length})`
                        : `Registros (${filtrados.length})`}
                    </h2>
                  </div>

                  <div className={styles.tableScroll}>
                    <table
                      className={`${styles.table} ${
                        secao === "clientes"
                          ? styles.clientsTable
                          : styles.recordsTable
                      }`}
                    >
                      <thead>
                        <tr>
                          <th>{secao === "clientes" ? "Cliente" : "OS / Música"}</th>
                          <th>{secao === "clientes" ? "E-mail" : "Cliente"}</th>
                          {secao === "clientes" && <th>Telefone</th>}
                          <th>Situação</th>
                          <th>Início</th>
                          <th>Última atividade</th>
                          <th>Valor</th>
                          <th>Cupom / Desconto</th>
                          {(secao === "pedidos" || secao === "musicas") && (
                            <th>Liberação administrativa</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {(secao === "clientes" ? clientes : filtrados).map(
                          (p) => (
                            <tr key={p.id}>
                              <td>
                                {secao === "clientes" ? (
                                  <strong>{p.cliente_nome}</strong>
                                ) : (
                                  <>
                                    <strong>{`OS ${p.os_number ?? "—"}`}</strong>
                                    <div>{p.titulo}</div>
                                  </>
                                )}
                              </td>
                              <td>
                                <Link
                                  href={`/admin/clientes?usuario=${encodeURIComponent(p.user_id)}`}
                                >
                                  {secao === "clientes"
                                    ? p.cliente_email ?? "Sem e-mail"
                                    : p.cliente_nome}
                                </Link>
                              </td>
                              {secao === "clientes" && (
                                <td>{p.celular_1 ?? p.celular_2 ?? "Sem telefone"}</td>
                              )}
                              <td>{status(p)}</td>
                              <td>{data(p.created_at)}</td>
                              <td>{data(p.updated_at)}</td>
                              <td>{moeda(p.payment_amount_cents)}</td>
                              <td>
                                {p.applied_coupon_code ?? "—"}
                                {p.discount_amount_cents != null &&
                                  p.discount_amount_cents > 0 && (
                                    <div>
                                      {`Desconto: ${moeda(p.discount_amount_cents)}`}
                                    </div>
                                  )}
                              </td>

                              {(secao === "pedidos" || secao === "musicas") && (
                                <td>
                                  {p.admin_grant ? (
                                    <div>
                                      <strong>
                                        {p.admin_grant.grant_mode === "WAIVE_BALANCE"
                                          ? "Cobrança dispensada"
                                          : "Cobrança mantida"}
                                      </strong>
                                      <div>
                                        {`Registrado em ${data(p.admin_grant.granted_at)}`}
                                      </div>
                                      <div>
                                        {`Valor dispensado: ${moeda(p.admin_grant.waived_cents)}`}
                                      </div>
                                      <div>
                                        {`Saldo devido: ${moeda(
                                          p.admin_grant.original_due_cents -
                                          p.admin_grant.waived_cents
                                        )}`}
                                      </div>
                                    </div>
                                  ) : p.payment_status === "APPROVED" ? (
                                    <span>Pagamento já aprovado</span>
                                  ) : p.music_1_storage_path &&
                                    p.payment_status === "PENDING" ? (
                                    <div
                                      style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 8,
                                        minWidth: 190,
                                      }}
                                    >
                                      <button
                                        type="button"
                                        disabled={operandoId !== null}
                                        onClick={() =>
                                          void liberarMusica(p, "KEEP_CHARGE")
                                        }
                                        style={{
                                          padding: "9px 12px",
                                          cursor: "pointer",
                                          borderRadius: 8,
                                          border: "1px solid #777",
                                          background: "#fff",
                                          color: "#222",
                                        }}
                                      >
                                        {operandoId === p.id
                                          ? "Processando..."
                                          : "Liberar mantendo cobrança"}
                                      </button>

                                      <button
                                        type="button"
                                        disabled={operandoId !== null}
                                        onClick={() =>
                                          void liberarMusica(p, "WAIVE_BALANCE")
                                        }
                                        style={{
                                          padding: "9px 12px",
                                          cursor: "pointer",
                                          borderRadius: 8,
                                          border: "1px solid #976c38",
                                          background: "#f7eddc",
                                          color: "#362719",
                                        }}
                                      >
                                        {operandoId === p.id
                                          ? "Processando..."
                                          : "Liberar e zerar cobrança"}
                                      </button>
                                    </div>
                                  ) : (
                                    <span>Indisponível</span>
                                  )}
                                </td>
                              )}
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}