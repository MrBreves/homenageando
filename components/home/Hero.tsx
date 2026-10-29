"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./Hero.module.css";
import { supabase } from "@/lib/supabase";

export default function Hero() {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showExampleLyrics, setShowExampleLyrics] = useState(false);
  const [exampleLyrics, setExampleLyrics] = useState("");
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsError, setLyricsError] = useState("");

  const exampleLyricsUrl =
    "https://cwkvapoathykdcwxozpk.supabase.co/storage/v1/object/public/homenageando-exemplos/minha-primeira-cancao.txt";

  const parchmentUrl =
    "https://cwkvapoathykdcwxozpk.supabase.co/storage/v1/object/public/homenageando-exemplos/Pergaminho.png.png";

  async function openExampleLyrics() {
    setShowExampleLyrics(true);
    setLyricsError("");

    if (exampleLyrics) return;

    setLyricsLoading(true);

    try {
      const response = await fetch(exampleLyricsUrl);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const lyrics = await response.text();

      if (!lyrics.trim()) {
        throw new Error("A letra está vazia.");
      }

      setExampleLyrics(lyrics);
    } catch {
      setLyricsError(
        "Não foi possível carregar a letra. Tente novamente."
      );
    } finally {
      setLyricsLoading(false);
    }
  }

  function formatAudioTime(seconds: number) {
    if (!Number.isFinite(seconds)) return "0:00";

    const minutes = Math.floor(seconds / 60);
    const remaining = Math.floor(seconds % 60);

    return `${minutes}:${String(remaining).padStart(2, "0")}`;
  }

  async function toggleExample() {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audio.paused) {
      audio.pause();
      return;
    }

    try {
      setAudioError(false);
      await audio.play();
    } catch {
      setIsPlaying(false);
      setAudioError(true);
    }
  }

  function restartExample() {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = 0;
    setCurrentTime(0);
  }

  function seekExample(value: number) {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;

    const nextTime = Math.max(
      0,
      Math.min(value, audio.duration),
    );

    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  }

  return (
    <section id="inicio" className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.photo}>
        <Image
          src="/images/fundo.webp"
          alt="Uma família reunida, emocionada ao ouvir uma música juntos."
          fill
          priority
          sizes="100vw"
          className={styles.familyImage}
        />
      </div>

      <div className={styles.container}>
        <div className={styles.introduction}>
          <p className={styles.eyebrow}>MÚSICAS QUE EMOCIONAM</p>

          <h1 id="hero-title" className={styles.title}>
            <span>Transforme</span>
            <span>sua história</span>
            <span className={styles.highlight}>
              em música
              <Image
                className={styles.titleOrnament}
                src="/images/coração_texto.webp"
                alt=""
                aria-hidden="true"
                width={2048}
                height={602}
              />
            </span>
          </h1>

          <p className={styles.description}>
            <span>Momentos especiais se tornam</span>{" "}
            <span>uma canção única e inesquecível.</span>
          </p>

          <div className={styles.offer}>
            <div className={styles.priceBlock}>
              <span className={styles.priceLabel}>Sua música completa por</span>
              <strong className={styles.price}>R$ 39,90</strong>
              <span className={styles.included}>
                MP3 + letra em PDF
                <audio
                  ref={audioRef}
                  preload="metadata"
                  src="https://cwkvapoathykdcwxozpk.supabase.co/storage/v1/object/public/homenageando-exemplos/minha-primeira-cancao.mp3.mp3"
                  onLoadedMetadata={(event) => {
                    const audio = event.currentTarget;

                    if (
                      Number.isFinite(audio.duration) &&
                      audio.duration > 0
                    ) {
                      setDuration(audio.duration);
                    }
                  }}
                  onDurationChange={(event) => {
                    const audio = event.currentTarget;

                    if (
                      Number.isFinite(audio.duration) &&
                      audio.duration > 0
                    ) {
                      setDuration(audio.duration);
                    }
                  }}
                  onTimeUpdate={(event) => {
                    const audio = event.currentTarget;

                    setCurrentTime(audio.currentTime);

                    if (
                      Number.isFinite(audio.duration) &&
                      audio.duration > 0
                    ) {
                      setDuration(audio.duration);
                    }
                  }}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => {
                    setIsPlaying(false);
                    setCurrentTime(0);
                    if (audioRef.current) {
                      audioRef.current.currentTime = 0;
                    }
                  }}
                  onError={() => {
                    setIsPlaying(false);
                    setAudioError(true);
                  }}
                />

                <div
                  className={`${styles.example} ${styles.playerControls}`}
                  aria-label="Player da música de exemplo"
                >
                  <button
                    type="button"
                    className={styles.playerPlay}
                    onClick={() => void toggleExample()}
                    aria-label={isPlaying ? "Pausar" : "Reproduzir"}
                  >
                    {isPlaying ? (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <rect x="5" y="4" width="5" height="16" rx="1" />
                        <rect x="14" y="4" width="5" height="16" rx="1" />
                      </svg>
                    ) : (
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M8 4.5v15l12-7.5-12-7.5Z" />
                      </svg>
                    )}
                  </button>

                  <div className={styles.playerContent}>
                    <div className={styles.playerHeading}>
                      <div className={styles.playerTitle}>
                        <strong>Mãe, Minha Primeira Canção</strong>
                        <span>Ouça um exemplo</span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          flexShrink: 0,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => void openExampleLyrics()}
                          aria-label="Ver letra da música"
                          title="Ver letra"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minHeight: 32,
                            padding: "5px 9px",
                            border: "1px solid #dfb66c",
                            borderRadius: 8,
                            background: "#fff8e9",
                            color: "#754910",
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Ver letra
                        </button>

                        <button
                          type="button"
                          className={styles.playerRestart}
                          onClick={restartExample}
                          aria-label="Voltar ao início"
                          title="Voltar ao início"
                        >
                          <svg
                            width="19"
                            height="19"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M3 11a9 9 0 1 1 3 7" />
                            <path d="M3 4v7h7" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className={styles.playerTimeline}>
                      <div className={styles.playerWaveArea}>
                        <div
                          className={`${styles.playerWaveform} ${
                            isPlaying ? styles.playerWaveformPlaying : ""
                          }`}
                          aria-hidden="true"
                        >
                          {Array.from({ length: 45 }, (_, index) => (
                            <i
                              key={index}
                              style={{
                                animationDelay: `${-(index * 0.073) % 1.2}s`,
                                animationDuration: `${
                                  0.65 + (index % 7) * 0.13
                                }s`,
                              }}
                            />
                          ))}
                        </div>

                        <input
                          type="range"
                          min={0}
                          max={duration || 1}
                          step={0.1}
                          value={Math.min(currentTime, duration || 1)}
                          onChange={(event) =>
                            seekExample(Number(event.currentTarget.value))
                          }
                          disabled={duration <= 0}
                          aria-label="Posição da música"
                          className={styles.playerProgress}
                          style={{
                            background: `linear-gradient(
                              to right,
                              #b97816 0%,
                              #b97816 ${
                                duration > 0
                                  ? (currentTime / duration) * 100
                                  : 0
                              }%,
                              rgba(145, 111, 63, 0.45) ${
                                duration > 0
                                  ? (currentTime / duration) * 100
                                  : 0
                              }%,
                              rgba(145, 111, 63, 0.45) 100%
                            )`,
                          }}
                        />
                      </div>

                      <div className={styles.playerTimes}>
                        <span>{formatAudioTime(currentTime)}</span>
                        <span>
                          {duration > 0
                            ? formatAudioTime(duration)
                            : "--:--"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {audioError && (
                  <span role="alert">
                    Não foi possível reproduzir o exemplo.
                  </span>
                )}
              </span>
          </div>

            <Link
              href="/criar"
              className={styles.cta}
              onClick={async (event) => {
                event.preventDefault();

                const {
                  data: { user },
                  error,
                } = await supabase.auth.getUser();

                if (error || !user) {
                  sessionStorage.setItem(
                    "homenageando_login_return",
                    "/criar"
                  );

                  router.push("/entrar");
                  return;
                }

                router.push("/criar");
              }}
            >
              <span>Criar minha música</span>
              <span aria-hidden="true">→</span>
            </Link>

            <p className={styles.delivery}>
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
              <span>
                <strong>Entrega Rápida:</strong> aproximadamente 5 minutos. <br />
                <strong>Sem custo adicional.</strong>
              </span>
            </p>
          </div>
        </div>
      </div>



      <svg
        className={styles.waveDivider}
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          className={styles.waveFill}
          d="M0 58 C170 72 250 104 420 91 C600 77 630 35 820 48 C1010 62 1080 101 1220 84 C1320 72 1380 62 1440 69 L1440 120 L0 120 Z"
        />
        <path
          className={styles.waveLine}
          d="M0 57 C170 71 250 103 420 90 C600 76 630 34 820 47 C1010 61 1080 100 1220 83 C1320 71 1380 61 1440 68"
        />
      </svg>
      <span className={styles.waveHeart} aria-hidden="true">♡</span>

      {showExampleLyrics &&
        createPortal(
          <div
            role="presentation"
            onClick={() => setShowExampleLyrics(false)}
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
              aria-labelledby="example-lyrics-title"
              onClick={(event) => event.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: 520,
                maxHeight: "85dvh",
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
                    id="example-lyrics-title"
                    style={{
                      margin: 0,
                      fontSize: 20,
                      color: "#2b1b13",
                    }}
                  >
                    Mãe, Minha Primeira Canção
                  </h2>
                  <p
                    style={{
                      margin: "5px 0 0",
                      fontSize: 13,
                      color: "#806447",
                    }}
                  >
                    Letra da música demonstrativa
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowExampleLyrics(false)}
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
                  overflowY: "auto",
                  minHeight: 0,
                  background: "#f5e6c9",
                  padding: "12px",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    maxWidth: 480,
                    minHeight: 850,
                    margin: "0 auto",
                    backgroundImage: `url("${parchmentUrl}")`,
                    backgroundSize: "100% 100%",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                    padding: "145px 12% 160px",
                    boxSizing: "border-box",
                    textAlign: "center",
                  }}
                >
                  {lyricsLoading ? (
                    <p
                      role="status"
                      style={{
                        fontFamily: "Georgia, serif",
                        color: "#4a2e1b",
                        fontSize: 16,
                      }}
                    >
                      Carregando letra...
                    </p>
                  ) : lyricsError ? (
                    <div role="alert">
                      <p
                        style={{
                          color: "#7b301e",
                          fontSize: 15,
                          lineHeight: 1.5,
                        }}
                      >
                        {lyricsError}
                      </p>

                      <button
                        type="button"
                        onClick={() => void openExampleLyrics()}
                        style={{
                          padding: "9px 15px",
                          border: "1px solid #b58a49",
                          borderRadius: 8,
                          background: "#fff4dd",
                          color: "#4a2e1b",
                          cursor: "pointer",
                        }}
                      >
                        Tentar novamente
                      </button>
                    </div>
                  ) : (
                    <>
                      <h3
                        style={{
                          margin: "0 0 22px",
                          color: "#4a2e1b",
                          fontFamily:
                            "'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive",
                          fontWeight: 600,
                          fontSize: "clamp(19px, 4vw, 25px)",
                          lineHeight: 1.4,
                        }}
                      >
                        Mãe, Minha Primeira Canção
                      </h3>

                      <p
                        style={{
                          margin: "0 0 18px",
                          fontFamily: "Georgia, serif",
                          fontStyle: "italic",
                          fontSize: 13,
                          color: "#79532f",
                        }}
                      >
                        Uma homenagem de Mariana para Helena
                      </p>

                      <div
                        aria-hidden="true"
                        style={{
                          width: 100,
                          height: 1,
                          margin: "0 auto 24px",
                          background: "#a37b43",
                        }}
                      />

                      <p
                        style={{
                          margin: 0,
                          whiteSpace: "pre-line",
                          overflowWrap: "break-word",
                          fontFamily:
                            "'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive",
                          fontSize: "clamp(12px, 2.8vw, 16px)",
                          fontWeight: 400,
                          lineHeight: 1.9,
                          color: "#4a2e1b",
                        }}
                      >
                        {exampleLyrics}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </section>
          </div>,
          document.body
        )}
    </section>
  );
}
