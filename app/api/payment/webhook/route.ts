import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const API = "https://api.mercadopago.com";
const PAYMENT_ID = /^[0-9]{1,30}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Payment = {
  id?: number | string;
  status?: string;
  live_mode?: boolean;
  external_reference?: string;
  transaction_amount?: number;
  currency_id?: string;
};

function response(status: number, message: string) {
  return NextResponse.json(
    { message },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

function verifySignature(
  request: NextRequest,
  dataId: string,
  secret: string,
): boolean {
  const signature = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");

  if (!signature || !requestId || !dataId) {
    return false;
  }

  const values = new Map<string, string>();

  for (const entry of signature.split(",")) {
    const index = entry.indexOf("=");
    if (index < 0) continue;

    values.set(
      entry.slice(0, index).trim(),
      entry.slice(index + 1).trim(),
    );
  }

  const ts = values.get("ts");
  const hash = values.get("v1");

  if (
    !ts ||
    !/^[0-9]{10}(?:[0-9]{3})?$/.test(ts) ||
    !hash ||
    !/^[a-f0-9]{64}$/i.test(hash)
  ) {
    return false;
  }

  // Aceita timestamp em segundos ou milissegundos.
  // Recusa notificações antigas ou muito adiantadas.
  const timestamp = Number(ts);
  const timestampMs =
    ts.length === 10 ? timestamp * 1000 : timestamp;

  if (
    !Number.isSafeInteger(timestampMs) ||
    Math.abs(Date.now() - timestampMs) > 300000
  ) {
    return false;
  }

  // Manifest documentado pelo Mercado Pago.
  const manifest =
    `id:${dataId.toLowerCase()};` +
    `request-id:${requestId};` +
    `ts:${ts};`;

  const expected = createHmac("sha256", secret)
    .update(manifest)
    .digest();

  const received = Buffer.from(hash, "hex");

  return (
    received.length === expected.length &&
    timingSafeEqual(received, expected)
  );
}

export async function POST(request: NextRequest) {
  // Mantém o webhook desativado no pagamento simbólico.
  if (process.env.PAYMENT_MODE !== "mercadopago_test") {
    return response(503, "Webhook não habilitado.");
  }

  const secret =
    process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim();

  const accessToken =
    process.env.MERCADOPAGO_ACCESS_TOKEN_TEST?.trim();

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    !secret ||
    !accessToken ||
    !supabaseUrl ||
    !serviceKey
  ) {
    return response(503, "Configuração incompleta.");
  }

  // Somente eventos de pagamento.
  const type = request.nextUrl.searchParams.get("type");
  const dataId =
    request.nextUrl.searchParams.get("data.id");

  if (type !== "payment" || !dataId) {
    return response(200, "Evento ignorado.");
  }

  if (!PAYMENT_ID.test(dataId)) {
    return response(400, "Identificador inválido.");
  }

  if (!verifySignature(request, dataId, secret)) {
    return response(401, "Assinatura inválida.");
  }

  const contentLength = Number(
    request.headers.get("content-length") ?? "0",
  );

  if (
    !Number.isFinite(contentLength) ||
    contentLength > 4096
  ) {
    return response(400, "Notificação inválida.");
  }

  try {
    const raw = await request.text();

    if (Buffer.byteLength(raw, "utf8") > 4096) {
      return response(400, "Notificação inválida.");
    }

    const notification: unknown = JSON.parse(raw);

    if (
      !notification ||
      typeof notification !== "object" ||
      Array.isArray(notification)
    ) {
      return response(400, "Notificação inválida.");
    }

    const event = notification as Record<string, unknown>;
    const data =
      event.data &&
      typeof event.data === "object" &&
      !Array.isArray(event.data)
        ? event.data as Record<string, unknown>
        : null;

    if (
      event.type !== "payment" ||
      String(data?.id ?? "") !== dataId ||
      event.live_mode !== false
    ) {
      return response(400, "Evento incompatível.");
    }
  } catch {
    return response(400, "Notificação inválida.");
  }

  // Consulta a fonte oficial: não confia no status do webhook.
  let payment: Payment;

  try {
    const result = await fetch(
      `${API}/v1/payments/${dataId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
      },
    );

    if (!result.ok) {
      console.error(
        "[MP webhook] Consulta de pagamento falhou:",
        result.status,
      );

      return response(503, "Consulta indisponível.");
    }

    payment = (await result.json()) as Payment;
  } catch {
    return response(503, "Consulta indisponível.");
  }

  // Pagamentos pendentes ou recusados não liberam música.
  if (payment.status !== "approved") {
    return response(200, "Pagamento ainda não aprovado.");
  }

  if (
    String(payment.id ?? "") !== dataId ||
    payment.live_mode !== false ||
    typeof payment.external_reference !== "string" ||
    !UUID.test(payment.external_reference) ||
    payment.currency_id !== "BRL" ||
    typeof payment.transaction_amount !== "number" ||
    !Number.isFinite(payment.transaction_amount)
  ) {
    return response(409, "Pagamento incompatível.");
  }

  const amountCents =
    Math.round(payment.transaction_amount * 100);

  if (
    amountCents < 1 ||
    amountCents > 3990 ||
    Math.abs(
      payment.transaction_amount * 100 - amountCents
    ) > 0.000001
  ) {
    return response(409, "Valor inválido.");
  }

  const supabase = createClient(
    supabaseUrl,
    serviceKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );

  // A transação do banco verifica pedido, provedor,
  // valor e reserva do cupom antes de liberar a música.
  const { data, error } = await supabase.rpc(
    "confirm_homenageando_mp_payment",
    {
      p_order_id: payment.external_reference,
      p_payment_id: dataId,
      p_amount_cents: amountCents,
      p_currency: "BRL",
    },
  );

  if (error) {
    console.error(
      "[MP webhook] Falha na confirmação do banco:",
      error.code,
    );

    return response(503, "Confirmação indisponível.");
  }

  if (!data?.success) {
    console.error(
      "[MP webhook] Pagamento recusado pelo controle do pedido.",
    );

    return response(409, "Confirmação não autorizada.");
  }

  return response(200, "Notificação processada.");
}