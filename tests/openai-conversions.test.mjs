import test from "node:test";
import assert from "node:assert/strict";
import { reportApprovedPurchase } from "../lib/openai-conversions.mjs";

const env = {
  OPENAI_ADS_CONVERSION_API_KEY: "test-only",
  OPENAI_ADS_PIXEL_ID: "pixel-test",
};

test("não envia evento sem credenciais", async () => {
  let calls = 0;
  const result = await reportApprovedPurchase({
    paymentId: "1234",
    amountCents: 3990,
    env: {},
    fetchImpl: async () => { calls += 1; return { ok: true }; },
  });
  assert.equal(result.status, "disabled");
  assert.equal(calls, 0);
});

test("não envia evento com identificador inválido", async () => {
  const result = await reportApprovedPurchase({
    paymentId: "../../invalid",
    amountCents: 3990,
    env,
    fetchImpl: async () => { throw Error("não pode chamar"); },
  });
  assert.equal(result.status, "invalid-payment-id");
});

test("envia o payload esperado, com ID estável e sem dados pessoais", async () => {
  const events = [];
  for (let i = 0; i < 2; i++) {
    const result = await reportApprovedPurchase({
      paymentId: "123456",
      amountCents: 3990,
      approvedAtMs: 1793894400000,
      env,
      fetchImpl: async (url, options) => {
        assert.equal(url.origin, "https://bzr.openai.com");
        assert.equal(url.searchParams.get("pid"), "pixel-test");
        assert.equal(options.headers.Authorization, "Bearer test-only");
        const body = JSON.parse(options.body);
        assert.equal(body.validate_only, false);
        events.push(body.events[0]);
        return { ok: true, status: 200 };
      },
    });
    assert.equal(result.status, "sent");
  }
  assert.deepEqual(events[0], events[1]);
  assert.equal(events[0].id, "mp_purchase_123456");
  assert.equal(events[0].type, "custom");
  assert.equal(events[0].custom_event_name, "purchase_approved");
  assert.equal(events[0].action_source, "web");
  assert.deepEqual(events[0].data, { type: "custom", amount: 3990, currency: "BRL" });
});

test("uma falha externa não quebra o pagamento", async () => {
  const result = await reportApprovedPurchase({
    paymentId: "1234",
    amountCents: 3990,
    env,
    fetchImpl: async () => { throw new Error("network unavailable"); },
  });
  assert.equal(result.status, "failed");
});

test("resposta HTTP de erro não é considerada evento recebido", async () => {
  const result = await reportApprovedPurchase({
    paymentId: "1234",
    amountCents: 3990,
    env,
    fetchImpl: async () => ({ ok: false, status: 422 }),
  });
  assert.deepEqual(result, { status: "failed", httpStatus: 422 });
});
