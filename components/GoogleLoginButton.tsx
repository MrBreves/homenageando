"use client";

import { useRef, useState } from "react";
import Image from "next/image";

import { supabase } from "@/lib/supabase";

type GoogleLoginButtonProps = {
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
};

export default function GoogleLoginButton({
  disabled,
  onBusyChange,
}: GoogleLoginButtonProps) {
  const iniciando = useRef(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  async function handleGoogleLogin() {
    if (disabled || iniciando.current) {
      return;
    }

    iniciando.current = true;
    setCarregando(true);
    onBusyChange(true);
    setErro("");

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          skipBrowserRedirect: true,
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (error || !data.url) {
        throw new Error("Não foi possível iniciar o login.");
      }

      window.location.assign(data.url);
    } catch {
      setErro(
        "Não foi possível conectar ao Google. Tente novamente."
      );
      iniciando.current = false;
      setCarregando(false);
      onBusyChange(false);
    }
  }

  return (
    <div
      className="auth-google-group"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
      }}
    >
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={disabled || carregando}
        aria-label="Continuar com o Google"
        aria-busy={carregando}
        title="Continuar com o Google"
        style={{
          display: "block",
          width: "100%",
          maxWidth: "400px",
          height: "auto",
          padding: 0,
          margin: "0 auto",
          border: "none",
          borderRadius: 0,
          background: "transparent",
          boxShadow: "none",
          cursor:
            disabled || carregando
              ? "not-allowed"
              : "pointer",
          opacity:
            disabled || carregando
              ? 0.65
              : 1,
        }}
      >
         <Image
          src="/images/png/Google_btn.png"
          alt="Continuar com o Google"
          width={1200}
          height={500}
          priority
          className="auth-google-image"
          style={{
            display: "block",
            width: "100%",
            height: "auto",
            objectFit: "contain",
          }}
        />
      </button>

      {erro && (
        <p
          className="auth-message auth-message-error"
          role="alert"
        >
          {erro}
        </p>
      )}
    </div>
  );
}