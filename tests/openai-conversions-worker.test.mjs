import test from "node:test";
import assert from "node:assert/strict";
import { flushOpenAIConversions } from "../lib/openai-conversions-worker.mjs";

const env = {
  OPENAI_ADS_CONVERSION_API_KEY: "test-only",
  OPENAI_ADS_PIXEL_ID: "pixel-test",
};

test("fila desabilitada sem credenciais não é consultada", async () => {
  let calls = 0;
  const result = await flushOpenAIConversions({
    env: {},
    client: { rpc: async () => { calls++; return { data: [] }; } },
  });
  assert.equal(result.status, "disabled");
  assert.equal(calls, 0);
});

test("compra aprovada usa timestamp original, oppref e valor em centavos", async () => {
  const time = new Date(Date.now() - 60_000).toISOString();
  const calls = [];
  const client = {
    rpc: async (name, args) => {
      calls.push({ name, args });
      if (name === "claim_openai_ads_conversion_events") {
        return { data: [{ payment_id: "12345", approved_at: time, amount_cents: 3990, oppref: "gAAAAAb/12==" }], error: null };
      }
      if (name === "finish_openai_ads_conversion_event") return { data: true, error: null };
      throw new Error("RPC inesperada");
    },
  };
  const result = await flushOpenAIConversions({
    env,
    client,
    fetchImpl: async (_url, init) => {
      const event = JSON.parse(init.body).events[0];
      assert.equal(event.timestamp_ms, Date.parse(time));
      assert.equal(event.oppref, "gAAAAAb/12==");
      assert.equal(event.data.amount, 3990);
      return { ok: true, status: 200 };
    },
  });
  assert.equal(result.sent, 1);
  assert.equal(calls[1].args.p_sent, true);
});

test("falhas HTTP deixam o evento para reenvio", async () => {
  const client = {
    rpc: async (name, args) => {
      if (name === "claim_openai_ads_conversion_events") {
        return { data: [{ payment_id: "88", approved_at: new Date().toISOString(), amount_cents: 3990, oppref: null }], error: null };
      }
      assert.equal(args.p_sent, false);
      assert.equal(args.p_http_status, 503);
      return { data: true, error: null };
    },
  };
  const result = await flushOpenAIConversions({
    env, client, fetchImpl: async () => ({ ok: false, status: 503 }),
  });
  assert.equal(result.failed, 1);
  assert.equal(result.sent, 0);
});

test("eventos acima do prazo são expirados sem envio externo", async () => {
  const client = {
    rpc: async (name, args) => {
      if (name === "claim_openai_ads_conversion_events") {
        return { data: [{ payment_id: "777", approved_at: new Date(Date.now()-8*86400000).toISOString(), amount_cents: 3990 }], error: null };
      }
      assert.equal(args.p_expired, true);
      return { data: true, error: null };
    },
  };
  const result = await flushOpenAIConversions({
    env, client, fetchImpl: async () => { throw Error("Não enviar evento expirado"); },
  });
  assert.equal(result.expired, 1);
});
