"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { storeConsentedOpenAIReference } from "@/lib/openai-attribution-client";

/**
 * Visible only for traffic with the OpenAI ad click reference.
 * No advertising ID is stored until the visitor opts in.
 */
export default function OpenAIAdsConsent() {
  const [ref, setRef] = useState<string | null>(null);
  useEffect(() => {
    const parameter = new URL(window.location.href).searchParams.get("oppref");
    if (parameter && /^[A-Za-z0-9._~%-]{1,1024}$/.test(parameter)) {
      setRef(parameter);
    }
  }, []);

  if (!ref) return null;
  return (
    <aside
      role="region"
      aria-label="Consentimento de mensuração publicitária"
      style={{
        position: "fixed", insetInline: 16, bottom: 16, zIndex: 1000,
        marginInline: "auto", maxWidth: 480, borderRadius: 12,
        padding: 16, background: "#fff9f0", color: "#302016",
        border: "1px solid #c49a65", boxShadow: "0 4px 20px #0003",
        fontSize: 14, lineHeight: 1.5,
      }}
    >
      <p style={{ margin: "0 0 12px" }}>
        Podemos associar esta visita ao anúncio que trouxe você até o
        Homenageando para medir compras? Você pode recusar sem afetar a compra.
        Consulte nossa <Link href="/privacidade">Política de Privacidade</Link>.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => {
            storeConsentedOpenAIReference(ref);
            setRef(null);
          }}
          style={{ background: "#803d10", color: "white", border: 0, borderRadius: 8, padding: "9px 14px", cursor: "pointer" }}
        >
          Permitir mensuração
        </button>
        <button
          type="button"
          onClick={() => setRef(null)}
          style={{ background: "#eee5dc", color: "#302016", border: 0, borderRadius: 8, padding: "9px 14px", cursor: "pointer" }}
        >
          Não permitir
        </button>
      </div>
    </aside>
  );
}
