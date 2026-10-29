"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { getUserOrders, type Order } from "@/lib/order-service";
import type { OrderState } from "@/types/order-state";
import {
  getMusicTitle,
  getMusicFileName,
} from "@/lib/music-title";

const STATUS_LABELS: Record<OrderState, string> = {
  INICIAL: "Solicitação iniciada",
  CADASTRO: "Cadastro em andamento",
  EMAIL_VALIDADO: "E-mail confirmado",
  LOGIN: "Acesso à conta",
  QUESTIONÁRIO_ABERTO: "Questionário em andamento",
  GERANDO_MUSICA_1: "Criando sua música",
  MUSICA_1_PREVIEW: "Música gerada — aguardando pagamento",
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  PAGAMENTO_CONFIRMADO: "Pagamento confirmado",
  MUSICA_1_DISPONIVEL: "Música disponível",
  TELA_DE_EDICAO: "Edição da segunda versão",
  MUSICA_2_GERANDO: "Criando a segunda versão",
  MUSICA_2_DISPONIVEL: "Segunda versão disponível",
};

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data indisponível";
  }

  return date.toLocaleDateString("pt-BR");
}

function ActionIcon({
  kind,
}: {
  kind: "play" | "download" | "share" | "file";
}) {
  const common = {
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  if (kind === "play") {
    return (
      <svg {...common}>
        <path d="m8 5 11 7-11 7V5Z" />
      </svg>
    );
  }

  if (kind === "download") {
    return (
      <svg {...common}>
        <path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4" />
      </svg>
    );
  }

  if (kind === "share") {
    return (
      <svg {...common}>
        <path d="M14 4V2l8 8-8 8v-5C7 13 4 16 2 21c0-9 4-15 12-15V4Z" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M6 2h9l4 4v16H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm9 0v5h5M8 12h8M8 16h8" />
    </svg>
  );
}

const PARCHMENT_URL =
  "https://cwkvapoathykdcwxozpk.supabase.co/storage/v1/object/public/homenageando-exemplos/Pergaminho.png.png";

async function createLyricsPdf(
  lyrics: string,
  orderId: string,
  musicTitle: string,
): Promise<File> {
  const { jsPDF } = await import("jspdf");

  const parchment = new Image();
  parchment.crossOrigin = "anonymous";

  await new Promise<void>((resolve, reject) => {
    parchment.onload = () => resolve();
    parchment.onerror = () =>
      reject(new Error("Não foi possível carregar o pergaminho."));
    parchment.src = PARCHMENT_URL;
  });

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = 1050;
  const pageHeight = 1485;
  const contentWidth = 730;
  const top = 215;
  const bottom = 215;
  const lineHeight = 35;

  const canvas = document.createElement("canvas");
  canvas.width = pageWidth;
  canvas.height = pageHeight;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Não foi possível preparar o PDF.");
  }

  function drawPage() {
    context!.clearRect(0, 0, pageWidth, pageHeight);

    context!.drawImage(
      parchment,
      0,
      0,
      pageWidth,
      pageHeight,
    );

    context!.textAlign = "center";
    context!.textBaseline = "middle";
    context!.fillStyle = "#4a2e1b";
  }

  function wrapLine(text: string, maxWidth: number): string[] {
    const words = text.split(/\s+/).filter(Boolean);
    const result: string[] = [];
    let line = "";

    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;

      if (
        context!.measureText(candidate).width > maxWidth &&
        line
      ) {
        result.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }

    if (line) result.push(line);

    return result;
  }

  drawPage();

  context.font = "bold 43px Georgia, serif";
  context.fillText(
    musicTitle,
    pageWidth / 2,
    top,
    contentWidth,
  );

  context.font = "italic 23px Georgia, serif";
  context.fillStyle = "#79532f";
  context.fillText(
    "Uma homenagem especial criada no Homenageando",
    pageWidth / 2,
    top + 55,
    contentWidth,
  );

  context.strokeStyle = "#a37b43";
  context.beginPath();
  context.moveTo(pageWidth / 2 - 110, top + 88);
  context.lineTo(pageWidth / 2 + 110, top + 88);
  context.stroke();

  context.fillStyle = "#4a2e1b";
  context.font =
    "27px 'Segoe Print', 'Bradley Hand', cursive";

  let y = top + 135;
  let firstPage = true;

  function addPage() {
    pdf.addImage(
      canvas.toDataURL("image/jpeg", 0.92),
      "JPEG",
      0,
      0,
      210,
      297,
    );

    if (firstPage) {
      firstPage = false;
    }

    pdf.addPage();
    drawPage();

    context!.font =
      "27px 'Segoe Print', 'Bradley Hand', cursive";
    context!.fillStyle = "#4a2e1b";
    y = top;
  }

  const lines = lyrics.replace(/\r\n/g, "\n").split("\n");

  for (const originalLine of lines) {
    if (!originalLine.trim()) {
      y += lineHeight * 0.55;
      continue;
    }

    const wrappedLines = wrapLine(originalLine, contentWidth);

    for (const line of wrappedLines) {
      if (y + lineHeight > pageHeight - bottom) {
        addPage();
      }

      context.fillText(
        line,
        pageWidth / 2,
        y,
        contentWidth,
      );

      y += lineHeight;
    }
  }

  pdf.addImage(
    canvas.toDataURL("image/jpeg", 0.92),
    "JPEG",
    0,
    0,
    210,
    297,
  );

  const blob = pdf.output("blob");

  return new File(
    [blob],
    `${getMusicFileName(musicTitle)}-letra.pdf`,
    { type: "application/pdf" },
  );
}

function MusicActions({
  orderId,
  musicTitle,
}: {
  orderId: string;
  musicTitle: string;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [musicUrl, setMusicUrl] = useState("");
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyricsPdfUrl, setLyricsPdfUrl] = useState("");
  const lyricsPdfUrlRef = useRef<string | null>(null);

  const requestRef = useRef(false);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }

      if (lyricsPdfUrlRef.current) {
        URL.revokeObjectURL(lyricsPdfUrlRef.current);
      }
    };
  }, []);

  const actionStyle = {
    minWidth: 0,
    minHeight: 78,
    padding: "12px 4px",
    border: "1px solid #d6d6d6",
    borderRadius: 11,
    background: "#ffffff",
    color: "#301c12",
    fontFamily: "inherit",
    fontSize: 14,
    cursor: busy ? "wait" : "pointer",
    opacity: busy ? 0.6 : 1,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 7,
  };


  async function requestAsset(asset: "music" | "lyrics") {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session) {
      throw new Error("Entre novamente na sua conta para continuar.");
    }

    const response = await fetch(
      `/api/music/status?orderId=${encodeURIComponent(orderId)}&asset=${asset}`,
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      },
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error ?? "Não foi possível acessar o conteúdo.",
      );
    }

    return result;
  }

  function downloadFile(file: File) {
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  async function runAction(
    action:
      | "listen"
      | "downloadMusic"
      | "viewLyrics"
      | "downloadLyrics"
      | "shareMusic"
      | "shareLyrics",
  ) {
    if (requestRef.current) return;

    requestRef.current = true;
    setBusy(true);
    setMessage("");

    try {
      const isMusic =
        action === "listen" ||
        action === "downloadMusic" ||
        action === "shareMusic";

      const result = await requestAsset(isMusic ? "music" : "lyrics");

      let file: File;

      if (isMusic) {
        if (typeof result.musicUrl !== "string") {
          throw new Error("O endereço da música não está disponível.");
        }

        const response = await fetch(result.musicUrl, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Não foi possível carregar o arquivo da música.");
        }

        const blob = await response.blob();

        if (!blob.size) {
          throw new Error("O arquivo da música está vazio.");
        }

        file = new File(
          [blob],
          `${getMusicFileName(musicTitle)}.mp3`,
          {
            type: "audio/mpeg",
          }
        );

        if (action === "listen") {
          if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
          }

          const url = URL.createObjectURL(file);
          objectUrlRef.current = url;
          setMusicUrl(url);
          setMessage("Música carregada. Aperte reproduzir no player.");
          return;
        }
      } else {
        if (
          typeof result.lyrics_1 !== "string" ||
          !result.lyrics_1.trim()
        ) {
          throw new Error("A letra ainda não está disponível.");
        }

        file = await createLyricsPdf(
          result.lyrics_1,
          orderId,
          musicTitle
        );

        if (action === "viewLyrics") {
          const pdfUrl = URL.createObjectURL(file);

          if (lyricsPdfUrlRef.current) {
            URL.revokeObjectURL(lyricsPdfUrlRef.current);
          }

          lyricsPdfUrlRef.current = pdfUrl;
          setLyricsPdfUrl(pdfUrl);
          setShowLyrics(true);
          return;
        }
      }

      if (action === "shareMusic" || action === "shareLyrics") {
        if (
          typeof navigator.share === "function" &&
          typeof navigator.canShare === "function" &&
          navigator.canShare({ files: [file] })
        ) {
          try {
            await navigator.share({ files: [file] });
            setMessage("");
          } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
              setMessage("");
            } else {
              setMessage(
                "Não foi possível abrir o compartilhamento diretamente. Use Baixar para salvar o arquivo.",
              );
            }
          }
        } else {
          setMessage(
            "Este navegador não permite compartilhar esse arquivo diretamente. Use Baixar e anexe o arquivo no WhatsApp, e-mail ou aplicativo desejado.",
          );
        }

        return;
      }

      downloadFile(file);
      setMessage("Download solicitado ao navegador.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível concluir a ação.",
      );
    } finally {
      requestRef.current = false;
      setBusy(false);
    }
  }


  return (
    <section
      aria-label="Música e letra"
      aria-busy={busy}
      style={{ marginTop: 16 }}
    >
      <div style={{ marginBottom: 16 }}>
        <p style={{ margin: "0 0 8px", color: "#75685f", fontSize: 14 }}>
          Música
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          <button
            type="button"
            style={actionStyle}
            disabled={busy}
            onClick={() => void runAction("listen")}
          >
            <ActionIcon kind="play" />
            <span>Ouvir</span>
          </button>

          <button
            type="button"
            style={actionStyle}
            disabled={busy}
            onClick={() => void runAction("downloadMusic")}
          >
            <ActionIcon kind="download" />
            <span>Baixar</span>
          </button>

          <button
            type="button"
            style={actionStyle}
            disabled={busy}
            onClick={() => void runAction("shareMusic")}
          >
            <ActionIcon kind="share" />
            <span>Compartilhar</span>
          </button>
        </div>
      </div>

      <div>
        <p style={{ margin: "0 0 8px", color: "#75685f", fontSize: 14 }}>
          Letra
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          <button
            type="button"
            style={actionStyle}
            disabled={busy}
            onClick={() => {
              if (showLyrics) {
                setShowLyrics(false);
              } else {
                void runAction("viewLyrics");
              }
            }}
          >
            <ActionIcon kind="file" />
            <span>{showLyrics ? "Ocultar" : "Ver"}</span>
          </button>

          <button
            type="button"
            style={actionStyle}
            disabled={busy}
            onClick={() => void runAction("downloadLyrics")}
          >
            <ActionIcon kind="download" />
            <span>Baixar</span>
          </button>

          <button
            type="button"
            style={actionStyle}
            disabled={busy}
            onClick={() => void runAction("shareLyrics")}
          >
            <ActionIcon kind="share" />
            <span>Compartilhar</span>
          </button>
        </div>
      </div>

      {busy && <p role="status">Preparando…</p>}

      {message && (
        <p role="status" aria-live="polite" style={{ lineHeight: 1.5 }}>
          {message}
        </p>
      )}

 
      {musicUrl && (
        <audio
          controls
          src={musicUrl}
          aria-label="Reproduzir música completa"
          style={{ display: "block", width: "100%", marginTop: 16 }}
          onPlay={(event) => {
            const current = event.currentTarget;
            document.querySelectorAll("audio").forEach((audio) => {
              if (audio !== current) audio.pause();
            });
          }}
          onError={() =>
            setMessage("Não foi possível reproduzir o áudio carregado.")
          }
        />
      )}

      {showLyrics &&
        createPortal(
          <div
            role="presentation"
            onClick={() => setShowLyrics(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              background: "rgba(43, 27, 19, 0.65)",
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby={`lyrics-title-${orderId}`}
              onClick={(event) => event.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: 620,
                height: "94dvh",
                maxHeight: "94dvh",
                display: "flex",
                flexDirection: "column",
                borderRadius: 18,
                background: "#fffaf2",
                border: "1px solid #e3bd79",
                boxShadow: "0 16px 50px rgba(0,0,0,0.25)",
                overflow: "hidden",
              }}
            >
              <header
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "18px 22px",
                  borderBottom: "1px solid #eadcc5",
                }}
              >
                <div>
                  <h2
                    id={`lyrics-title-${orderId}`}
                    style={{
                      margin: 0,
                      fontSize: 20,
                      color: "#2b1b13",
                    }}
                  >
                    Letra da música
                  </h2>
                  <p
                    style={{
                      margin: "5px 0 0",
                      fontSize: 13,
                      color: "#806447",
                    }}
                  >
                    Visualização em pergaminho
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowLyrics(false)}
                  aria-label="Fechar letra"
                  style={{
                    flexShrink: 0,
                    width: 36,
                    height: 36,
                    border: "1px solid #e3bd79",
                    borderRadius: "50%",
                    background: "#fff3dc",
                    color: "#2b1b13",
                    fontSize: 24,
                    cursor: "pointer",
                  }}
                >
                  ×
                </button>
              </header>

              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  background: "#f5e6c9",
                  padding: 8,
                  display: "flex",
                }}
              >
                {lyricsPdfUrl && (
                  <iframe
                    src={lyricsPdfUrl}
                    title="Letra da música em pergaminho"
                    style={{
                      width: "100%",
                      height: "100%",
                      minHeight: 400,
                      border: 0,
                      borderRadius: 8,
                      background: "#fffaf2",
                    }}
                  />
                )}
              </div>
            </section>
          </div>,
          document.body
        )}
    </section>
  );
}

export default function MinhasMusicasPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      setLoading(true);
      setError(null);
      setOrders([]);

      try {
        const data = await getUserOrders(page);

        if (active) {
          setOrders(data);
        }
      } catch {
        if (active) {
          setError(
            "Não foi possível carregar seus pedidos. Confira sua conexão e se você está conectado à sua conta.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadOrders();

    return () => {
      active = false;
    };
  }, [page, retry]);

  const buttonStyle = {
    minHeight: 44,
    padding: "10px 16px",
    border: "1px solid #d6bd93",
    borderRadius: 10,
    background: "#fff8ec",
    color: "#301c12",
    fontSize: 14,
    cursor: "pointer",
  };

  return (
    <main
      style={{
        minHeight: "70vh",
        padding: "28px 16px 48px",
        background: "#fffaf2",
        color: "#301c12",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <header style={{ marginBottom: 24 }}>


          <h1
            style={{
              margin: "20px 0 8px",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: 30,
            }}
          >
            Minhas músicas
          </h1>

          <p style={{ margin: 0, color: "#65564d", lineHeight: 1.5 }}>
              Acompanhe suas solicitações de músicas, da criação à entrega.
          </p>
        </header>

        <section aria-label="Seus pedidos" aria-busy={loading}>
          {loading && (
            <p role="status">Carregando seus pedidos…</p>
          )}

          {!loading && error && (
            <div>
              <p role="alert" style={{ lineHeight: 1.5 }}>
                {error}
              </p>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <button
                  type="button"
                  style={buttonStyle}
                  onClick={() => setRetry((value) => value + 1)}
                >
                  Tentar novamente
                </button>

                <Link href="/entrar" style={{ color: "#754910" }}>
                  Entrar na conta
                </Link>
              </div>
            </div>
          )}

          {!loading && !error && orders.length === 0 && (
            <div>
              <p>
                {page === 1
                  ? "Você ainda não tem pedidos nesta conta."
                  : "Não há mais pedidos nesta página."}
              </p>

              {page === 1 && (
                <Link href="/criar" style={{ color: "#754910" }}>
                  Criar minha música
                </Link>
              )}
            </div>
          )}

          {!loading && !error && orders.length > 0 && (
            <ul
              style={{
                display: "grid",
                gap: 14,
                padding: 0,
                margin: 0,
                listStyle: "none",
              }}
            >
              {orders.map((order) => {
                const musicTitle = getMusicTitle(
                  order.questionnaire
                );

                return (
                  <li key={order.id}>
                    <article
                      style={{
                        padding: 20,
                        maxWidth: 520,
                        border: "1px solid #eadfce",
                        borderRadius: 14,
                        background: "#fffdf8",
                        overflowWrap: "anywhere",
                      }}
                    >
                      <h2
                        style={{
                          margin: "0 0 12px",
                          fontSize: 20,
                          fontFamily: 'Georgia, "Times New Roman", serif',
                        }}
                      >
                        {musicTitle}
                      </h2>

                      <p style={{ margin: "0 0 12px", fontWeight: 600 }}>
                        OS {String(order.os_number).padStart(4, "0")}
                      </p>

                      <p
                        style={{
                          display: "inline-block",
                          margin: "0 0 12px",
                          padding: "6px 10px",
                          borderRadius: 8,
                          background: "#fff0ce",
                          fontSize: 14,
                          lineHeight: 1.4,
                        }}
                      >
                        {STATUS_LABELS[order.state] ?? "Situação indisponível"}
                      </p>

                      <p
                        style={{
                          margin: "0 0 6px",
                          color: "#65564d",
                          fontSize: 14,
                        }}
                      >
                        Criado em {formatDate(order.created_at)}
                      </p>

                     {order.order_number && (
                        <p
                          style={{
                            margin: 0,
                            color: "#65564d",
                            fontSize: 12,
                          }}
                        >
                          Pedido: {order.order_number}
                        </p>
                      )}

                                            {(order.state === "MUSICA_1_DISPONIVEL" ||
                        order.state === "PAGAMENTO_CONFIRMADO") && (
                        <MusicActions
                          orderId={order.id}
                          musicTitle={musicTitle}
                        />
                      )}

                                            {(order.state === "QUESTIONÁRIO_ABERTO" ||
                        order.state === "AGUARDANDO_PAGAMENTO") && (
                        <div style={{ marginTop: 16 }}>
                          <Link
                            href="/criar"
                            aria-label={`${
                              order.state === "QUESTIONÁRIO_ABERTO"
                                ? "Continuar questionário"
                                : "Concluir pagamento"
                            } da OS ${String(order.os_number).padStart(4, "0")}`}
                            style={{
                              ...buttonStyle,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              boxSizing: "border-box",
                              maxWidth: "100%",
                              textDecoration: "none",
                              fontWeight: 600,
                            }}
                          >
                            {order.state === "QUESTIONÁRIO_ABERTO"
                              ? "Continuar questionário"
                              : "Concluir pagamento"}
                          </Link>
                        </div>
                      )}
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {!loading && !error && (page > 1 || orders.length === 20) && (
          <nav
            aria-label="Paginação dos pedidos"
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              marginTop: 24,
            }}
          >
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((value) => value - 1)}
              style={{
                ...buttonStyle,
                opacity: page === 1 ? 0.5 : 1,
                cursor: page === 1 ? "default" : "pointer",
              }}
            >
              Anterior
            </button>

            <span>Página {page}</span>

            <button
              type="button"
              disabled={orders.length < 20}
              onClick={() => setPage((value) => value + 1)}
              style={{
                ...buttonStyle,
                opacity: orders.length < 20 ? 0.5 : 1,
                cursor: orders.length < 20 ? "default" : "pointer",
              }}
            >
              Próxima
            </button>
          </nav>
        )}
      </div>
    </main>
  );
}
