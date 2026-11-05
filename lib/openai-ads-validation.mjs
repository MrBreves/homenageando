const URL_BASE = "https://bzr.openai.com/v1/events";
export async function validateOpenAIAdsConnection({
  env = process.env,
  fetchImpl = fetch,
  timestampMs = Date.now(),
} = {}) {
  const key = env.OPENAI_ADS_CONVERSION_API_KEY?.trim();
  const pixelId = env.OPENAI_ADS_PIXEL_ID?.trim();
  if (!key || !pixelId) return { ok: false, reason: "missing-credentials" };
  if (!Number.isSafeInteger(timestampMs)) return { ok: false, reason: "invalid-time" };

  const url = new URL(URL_BASE);
  url.searchParams.set("pid", pixelId);
  const payload = {
    validate_only: true,
    events: [{
      id: "validation_homenageando",
      type: "custom",
      custom_event_name: "purchase_approved",
      timestamp_ms: timestampMs,
      source_url: "https://www.homenageando.com.br/pagamento/retorno",
      action_source: "web",
      data: { type: "custom", amount: 3990, currency: "BRL" },
    }],
  };
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    return {
      ok: response.ok,
      reason: response.ok ? "validated" : "provider-rejected",
      providerStatus: response.status,
      validateOnly: true,
    };
  } catch {
    return { ok: false, reason: "network-error", validateOnly: true };
  }
}
