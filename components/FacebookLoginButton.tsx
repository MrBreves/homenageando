
"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";


type FacebookLoginButtonProps = {
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
};

export default function FacebookLoginButton({
  disabled,
  onBusyChange,
}: FacebookLoginButtonProps) {
  const iniciando = useRef(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  async function handleFacebookLogin() {
    if (disabled || iniciando.current) {
      return;
    }

    iniciando.current = true;
    setCarregando(true);
    onBusyChange(true);
    setErro("");

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "facebook",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          skipBrowserRedirect: true,
        },
      });

      if (error || !data.url) {
        throw new Error("Não foi possível iniciar o login.");
      }

      window.location.assign(data.url);
    } catch {
      setErro(
        "Não foi possível conectar ao Facebook. Tente novamente."
      );

      iniciando.current = false;
      setCarregando(false);
      onBusyChange(false);
    }
  }

  return (
    <div className="auth-facebook-group">
      <button
        className="auth-facebook-button"
        type="button"
        onClick={handleFacebookLogin}
        disabled={disabled || carregando}
        aria-label="Continuar com Facebook"
        aria-busy={carregando}
        title="Continuar com Facebook"
      >
        <Image
          src="/images/icons/facebook.svg"
          alt=""
          width={64}
          height={64}
        />

      </button>


      {erro && (
        <p className="auth-message auth-message-error" role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}
