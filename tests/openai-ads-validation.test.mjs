import test from "node:test";
import assert from "node:assert/strict";
import { validateOpenAIAdsConnection } from "../lib/openai-ads-validation.mjs";

const env = { OPENAI_ADS_CONVERSION_API_KEY: "test-secret", OPENAI_ADS_PIXEL_ID: "test-pixel" };

test("não envia sem configuração", async () => {
  const result = await validateOpenAIAdsConnection({
    env: {}, fetchImpl: async () => { throw Error("não chamar"); },
  });
  assert.deepEqual(result, { ok: false, reason: "missing-credentials" });
});

test("envia validate_only true sem gerar compra", async () => {
  const result = await validateOpenAIAdsConnection({
    env, timestampMs: 1793894400000,
    fetchImpl: async (url, req) => {
      assert.equal(url.searchParams.get("pid"), "test-pixel");
      assert.equal(req.headers.Authorization, "Bearer test-secret");
      const payload = JSON.parse(req.body);
      assert.equal(payload.validate_only, true);
      assert.equal(payload.events[0].custom_event_name, "purchase_approved");
      assert.equal(payload.events[0].timestamp_ms, 1793894400000);
      return { ok: true, status: 200 };
    },
  });
  assert.deepEqual(result, { ok: true, reason: "validated", providerStatus: 200, validateOnly: true });
});

test("rejeição da API não é considerada sucesso", async () => {
  const result = await validateOpenAIAdsConnection({
    env, fetchImpl: async () => ({ ok: false, status: 401 }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.providerStatus, 401);
});