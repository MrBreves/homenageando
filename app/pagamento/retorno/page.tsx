"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ReturnStatus =
  | "loading"
  | "approved"
  | "pending"
  | "not-approved"
  | "login"
  | "error";

export default function PagamentoRetornoPage() {
  const [status, setStatus] = useState<ReturnStatus>("loading");
  const [message, setMessage] = useState(
    "Estamos consultando a confirmação do seu pagamento.",
  );

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    const params = new URLSearchParams(window.location.search);

    // external_reference foi definido como o ID do pedido
    // na preferência enviada ao Mercado Pago.
    const orderId = params.get("external_reference");

    if (!orderId || !UUID_REGEX.test(orderId)) {
      setStatus("error");
      setMessage(
        "Não foi possível identificar o pedido. Consulte Minhas músicas.",
      );
      return;
    }

    async function checkPayment() {
      if (!active) return;

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (!active) return;

        if (authError || !user) {
          setStatus("login");
          setMessage(
            "Entre na sua conta para consultar o pagamento.",
          );
          return;
        }

        const { data: order, error } = await supabase
          .from("orders")
          .select("id, state, payment_status, payment_provider, payment_amount_cents")
          .eq("id", orderId!)
          .eq("user_id", user.id)
          .maybeSingle();

        if (!active) return;

        if (error || !order) {
          setStatus("error");
          setMessage(
            "Não foi possível consultar este pedido. Acesse Minhas músicas.",
          );
          return;
        }

        // Nunca aprovar com base na URL de retorno.
        if (
          order.payment_status === "APPROVED" &&
          order.state === "MUSICA_1_DISPONIVEL"
        ) {
          // Somente compras reais confirmadas no banco sao enviadas para
          // medicao. Cupons de 100% e pagamentos de teste nao contam.
          if (
            order.payment_provider === "MERCADO_PAGO_PROD" &&
            Number.isInteger(order.payment_amount_cents) &&
            order.payment_amount_cents > 0
          ) {
            const eventKey = `homenageando_ads_purchase_${order.id}`;
            let alreadyReported = false;

            try {
              alreadyReported = window.sessionStorage.getItem(eventKey) === "sent";
            } catch {
              // Bloqueio de armazenamento nao deve impedir medicao.
            }

            if (!alreadyReported) {
              try {
                const analyticsWindow = window as Window & {
                  dataLayer?: Record<string, unknown>[];
                };

                analyticsWindow.dataLayer = analyticsWindow.dataLayer || [];
                analyticsWindow.dataLayer.push({
                  event: "homenageando_purchase_approved",
                  ecommerce: {
                    transaction_id: order.id,
                    currency: "BRL",
                    value: order.payment_amount_cents / 100,
                  },
                });

                try {
                  window.sessionStorage.setItem(eventKey, "sent");
                } catch {
                  // A compra continua aprovada mesmo sem armazenamento.
                }
              } catch {
                // Falhas de analytics nao afetam a confirmacao do pagamento.
              }
            }
          }

          setStatus("approved");
          setMessage(
            "Pagamento confirmado! Sua música está disponível em Minhas músicas.",
          );
          return;
        }

        if (
          order.payment_provider !== "MERCADO_PAGO_TEST" &&
          order.payment_provider !== "MERCADO_PAGO_PROD"
        ) {
          setStatus("error");
          setMessage(
            "Este pedido não corresponde a um pagamento do Mercado Pago.",
          );
          return;
        }

        if (
          order.state === "AGUARDANDO_PAGAMENTO" &&
          order.payment_status === "PENDING"
        ) {
          attempts += 1;

          setStatus("pending");
          setMessage(
            "O pagamento ainda não foi confirmado. Sua música será liberada após a confirmação.",
          );

          // Aguarda a atualização feita pelo webhook.
          // Não modifica pedidos e não efetua cobranças.
          if (attempts < 12) {
            timer = setTimeout(() => {
              void checkPayment();
            }, 5000);
          }

          return;
        }

        setStatus("not-approved");
        setMessage(
          "Não há confirmação de pagamento para este pedido. Consulte Minhas músicas.",
        );
      } catch {
        if (!active) return;

        setStatus("error");
        setMessage(
          "Não foi possível consultar o pagamento. Tente novamente mais tarde.",
        );
      }
    }

    void checkPayment();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <section
      className="auth-page"
      aria-labelledby="payment-return-title"
    >
      <div className="auth-card">
        <div className="auth-heading">
          <h1 id="payment-return-title">
            {status === "approved"
              ? "Pagamento aprovado"
              : status === "pending" || status === "loading"
                ? "Confirmação de pagamento"
                : "Consultar pagamento"}
          </h1>
        </div>

        <p role="status" aria-live="polite">
          {message}
        </p>

        {status === "loading" && (
          <p>Aguarde a consulta do seu pedido.</p>
        )}

        {status === "pending" && (
          <p>
            Alguns pagamentos podem levar mais tempo
            para serem confirmados. Não é necessário
            realizar outra compra.
          </p>
        )}

        {status === "login" && (
          <p>
            <Link href="/entrar">Entrar na minha conta</Link>
          </p>
        )}

        <p>
          <Link href="/minhas-musicas">
            Ir para Minhas músicas
          </Link>
        </p>
      </div>
    </section>
  );
}