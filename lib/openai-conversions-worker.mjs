import { createClient } from "@supabase/supabase-js";
import { reportApprovedPurchase } from "./openai-conversions.mjs";

/**
 * Reads pending conversion events from a private transactional outbox.
 * The database leases each row so concurrent workers cannot process it at once.
 */
export async function flushOpenAIConversions({
  env = process.env,
  fetchImpl = fetch,
  client,
} = {}) {
  const apiKey = env.OPENAI_ADS_CONVERSION_API_KEY?.trim();
  const pixelId = env.OPENAI_ADS_PIXEL_ID?.trim();
  if (!apiKey || !pixelId) return { status: "disabled", processed: 0 };

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if ((!supabaseUrl || !serviceKey) && !client) {
    return { status: "missing-database-config", processed: 0 };
  }

  const db = client ?? createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: events, error: claimError } = await db.rpc(
    "claim_openai_ads_conversion_events",
    { p_limit: 10 },
  );
  if (claimError) {
    console.error("[OpenAI Ads] Falha ao buscar eventos pendentes.");
    return { status: "queue-error", processed: 0 };
  }

  let sent = 0;
  let failed = 0;
  let expired = 0;
  for (const event of events ?? []) {
    const approvedAtMs = Date.parse(event.approved_at);
    // The API accepts only events within the last seven days.
    const withinWindow = Number.isFinite(approvedAtMs)
      && approvedAtMs > Date.now() - 7 * 86400000
      && approvedAtMs < Date.now() + 10 * 60000;
    const result = withinWindow
      ? await reportApprovedPurchase({
          paymentId: event.payment_id,
          amountCents: event.amount_cents,
          approvedAtMs,
          oppref: event.oppref ?? undefined,
          env,
          fetchImpl,
        })
      : { status: "expired" };

    const success = result.status === "sent";
    // Finish is idempotent; failed responses remain eligible for retry.
    const { error: finishError } = await db.rpc(
      "finish_openai_ads_conversion_event",
      {
        p_payment_id: event.payment_id,
        p_sent: success,
        p_http_status: result.httpStatus ?? null,
        p_expired: result.status === "expired",
      },
    );
    if (finishError) {
      console.error("[OpenAI Ads] Falha ao atualizar status da fila.");
      failed += 1;
      continue;
    }
    if (success) sent += 1;
    else if (result.status === "expired") expired += 1;
    else failed += 1;
  }
  return { status: "ok", processed: (events ?? []).length, sent, failed, expired };
}
