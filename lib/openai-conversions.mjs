const OPENAI_CONVERSIONS_URL = "https://bzr.openai.com/v1/events";
const PURCHASE_EVENT = "purchase_approved";
const PAYMENT_ID = /^[0-9]{1,30}$/;

/**
 * Best-effort server-side conversion reporting. Only invoke after the
 * Mercado Pago payment is independently validated and confirmed by the DB.
 * This function must never influence payment approval or music delivery.
 */
export async function reportApprovedPurchase({
  paymentId,
  approvedAtMs = Date.now(),
  amountCents,
  fetchImpl = fetch,
  env = process.env,
}) {
  const apiKey = env.OPENAI_ADS_CONVERSION_API_KEY?.trim();
  const pixelId = env.OPENAI_ADS_PIXEL_ID?.trim();

  if (!apiKey || !pixelId) return { status: "disabled" };
  if (typeof paymentId !== "string" || !PAYMENT_ID.test(paymentId)) {
    return { status: "invalid-payment-id" };
  }
  if (!Number.isSafeInteger(amountCents) || amountCents < 1) {
    return { status: "invalid-amount" };
  }
  if (!Number.isSafeInteger(approvedAtMs) || approvedAtMs <= 0) {
    return { status: "invalid-timestamp" };
  }

  // Stable across webhook retries: OpenAI deduplicates the same event ID.
  const event = {
    id: `mp_purchase_${paymentId}`,
    type: "custom",
    custom_event_name: PURCHASE_EVENT,
    timestamp_ms: approvedAtMs,
    source_url: "https://www.homenageando.com.br/pagamento/retorno",
    action_source: "web",
    data: { type: "custom", amount: amountCents, currency: "BRL" },
  };

  try {
    const url = new URL(OPENAI_CONVERSIONS_URL);
    url.searchParams.set("pid", pixelId);
    const response = await fetchImpl(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ validate_only: false, events: [event] }),
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });

    if (!response.ok) {
      // Never log request data, credentials, or customer identifiers.
      console.warn("[OpenAI Ads] Falha no envio da conversão:", response.status);
      return { status: "failed", httpStatus: response.status };
    }

    return { status: "sent" };
  } catch {
    console.warn("[OpenAI Ads] API de conversões indisponível.");
    return { status: "failed" };
  }
}
