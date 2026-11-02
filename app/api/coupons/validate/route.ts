
import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { withAccountOperation } from "@/lib/account-deletion.mjs";

export const runtime = "nodejs";

const ORDER_ID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const COUPON_REGEX = /^[A-Z0-9_-]{4,40}$/;

type ValidateBody = {
  orderId?: unknown;
  couponCode?: unknown;
};

type RateLimitResult = {
  allowed: boolean;
  retry_after: number;
};

type CouponValidationResult = {
  valid: boolean;
  error?: string;
  code?: string;
  discountType?: "PERCENT" | "FIXED" | "FINAL";
  discountPercent?: number | null;
  discountFixedCents?: number | null;
  finalAmountCents?: number | null;
  originalAmountCents?: number;
  discountAmountCents?: number;
  totalAmountCents?: number;
};

function jsonError(
  message: string,
  status: number,
  retryAfter?: number,
) {
  const response = NextResponse.json(
    {
      success: false,
      valid: false,
      error: message,
    },
    { status },
  );

  response.headers.set("Cache-Control", "no-store");

  if (retryAfter !== undefined) {
    response.headers.set(
      "Retry-After",
      String(Math.max(1, Math.ceil(retryAfter))),
    );
  }

  return response;
}

async function handlePOST(request: NextRequest) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabaseServiceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  const rateLimitSecret =
    process.env.CONTACT_RATE_LIMIT_SECRET;

  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    !supabaseServiceRoleKey ||
    !rateLimitSecret
  ) {
    console.error(
      "Configuração obrigatória de validação de cupons ausente.",
    );

    return jsonError(
      "Serviço temporariamente indisponível.",
      503,
    );
  }

  const authorization =
    request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return jsonError(
      "Usuário não autenticado.",
      401,
    );
  }

  const accessToken = authorization
    .slice("Bearer ".length)
    .trim();

  if (!accessToken || accessToken.length > 8192) {
    return jsonError(
      "Sessão inválida.",
      401,
    );
  }

  const authClient = createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );

  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser(accessToken);

  if (userError || !user) {
    return jsonError(
      "Sessão inválida ou expirada.",
      401,
    );
  }

  const supabaseAdmin = createClient(
    supabaseUrl,
    supabaseServiceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );

  // O identificador do usuário não é armazenado em claro
  // na tabela de rate limit.
  const keyHash = createHmac(
    "sha256",
    rateLimitSecret,
  )
    .update(`coupon-validation:${user.id}`)
    .digest("hex");

  // Reutiliza o limite já existente no Supabase:
  // 5 tentativas a cada 10 minutos por identificador.
  const { data: rateData, error: rateError } =
    await supabaseAdmin.rpc(
      "consume_contact_rate_limit",
      {
        p_scope: "email",
        p_key_hash: keyHash,
      },
    );

  if (rateError || !Array.isArray(rateData)) {
    console.error(
      "Falha no rate limit de cupons:",
      rateError,
    );

    return jsonError(
      "Serviço temporariamente indisponível.",
      503,
    );
  }

  const rateLimit =
    rateData[0] as RateLimitResult | undefined;

  if (!rateLimit) {
    return jsonError(
      "Serviço temporariamente indisponível.",
      503,
    );
  }

  if (!rateLimit.allowed) {
    return jsonError(
      "Muitas tentativas. Tente novamente mais tarde.",
      429,
      rateLimit.retry_after,
    );
  }

  const contentLength = Number(
    request.headers.get("content-length") ?? "0",
  );

  if (
    !Number.isFinite(contentLength) ||
    contentLength > 2048
  ) {
    return jsonError(
      "Solicitação inválida.",
      400,
    );
  }

  let rawBody: string;

  try {
    rawBody = await request.text();

    if (Buffer.byteLength(rawBody, "utf8") > 2048) {
      return jsonError(
        "Solicitação inválida.",
        400,
      );
    }
  } catch {
    return jsonError(
      "Não foi possível ler a solicitação.",
      400,
    );
  }

  let body: ValidateBody;

  try {
    const parsed: unknown = JSON.parse(rawBody);

    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return jsonError(
        "Solicitação inválida.",
        400,
      );
    }

    body = parsed as ValidateBody;
  } catch {
    return jsonError(
      "Solicitação inválida.",
      400,
    );
  }

  if (
    typeof body.orderId !== "string" ||
    !ORDER_ID_REGEX.test(body.orderId)
  ) {
    return jsonError(
      "Pedido inválido.",
      400,
    );
  }

  if (typeof body.couponCode !== "string") {
    return jsonError(
      "Cupom inválido.",
      400,
    );
  }

  const couponCode = body.couponCode
    .trim()
    .toUpperCase();

  if (!COUPON_REGEX.test(couponCode)) {
    return jsonError(
      "Cupom inválido.",
      400,
    );
  }

  try {
    const { data, error } = await supabaseAdmin.rpc(
      "validate_homenageando_coupon_pending_compatible",
      {
        p_code: couponCode,
        p_user_id: user.id,
        p_order_id: body.orderId,
      },
    );

    if (error) {
      console.error(
        "Erro ao validar cupom:",
        error,
      );

      return jsonError(
        "Não foi possível validar o cupom.",
        503,
      );
    }

    const result =
      data as CouponValidationResult | null;

    if (!result?.valid) {
      return jsonError(
        "Cupom inválido.",
        422,
      );
    }

    const discountType = result.discountType;
    const discountPercent = result.discountPercent;
    const discountFixedCents = result.discountFixedCents;
    const finalAmountCents = result.finalAmountCents;

    const originalAmountCents =
      result.originalAmountCents;

    const discountAmountCents =
      result.discountAmountCents;

    const totalAmountCents =
      result.totalAmountCents;

    const percentValid =
      discountType === "PERCENT" &&
      Number.isInteger(discountPercent) &&
      typeof discountPercent === "number" &&
      discountPercent >= 1 &&
      discountPercent <= 100 &&
      discountFixedCents == null;

     const fixedValid =
      discountType === "FIXED" &&
      Number.isInteger(discountFixedCents) &&
      typeof discountFixedCents === "number" &&
      discountFixedCents >= 1 &&
      discountFixedCents <= 3990 &&
      discountPercent == null;

    const finalValid =
      discountType === "FINAL" &&
      Number.isInteger(finalAmountCents) &&
      typeof finalAmountCents === "number" &&
      finalAmountCents >= 1 &&
      finalAmountCents < 3990 &&
      discountPercent == null &&
      discountFixedCents == null;

    const expectedDiscount =
      percentValid && typeof discountPercent === "number"
        ? Math.floor((3990 * discountPercent + 50) / 100)
        : fixedValid && typeof discountFixedCents === "number"
          ? discountFixedCents
          : finalValid && typeof finalAmountCents === "number"
            ? 3990 - finalAmountCents
            : null;

    if (
      typeof result.code !== "string" ||
      !COUPON_REGEX.test(result.code) ||
      (!percentValid && !fixedValid && !finalValid) ||
      !Number.isInteger(originalAmountCents) ||
      !Number.isInteger(discountAmountCents) ||
      !Number.isInteger(totalAmountCents) ||
      originalAmountCents !== 3990 ||
      expectedDiscount === null ||
      discountAmountCents !== expectedDiscount ||
      totalAmountCents !== 3990 - expectedDiscount
    ) {
      console.error(
        "Valores inconsistentes retornados na validação.",
      );

      return jsonError(
        "Não foi possível validar o cupom.",
        503,
      );
    }

    const response = NextResponse.json({
      success: true,
      valid: true,
      coupon: {
        code: result.code,
        discountType: finalValid ? "FIXED" : discountType,
        discountPercent: percentValid ? discountPercent : null,
        discountFixedCents: fixedValid || finalValid ? expectedDiscount : null,
      },
      pricing: {
        currency: "BRL",
        originalAmountCents,
        discountAmountCents,
        totalAmountCents,
      },
    });

    response.headers.set(
      "Cache-Control",
      "no-store",
    );

    return response;
  } catch (error) {
    console.error(
      "Falha inesperada na validação do cupom:",
      error,
    );

    return jsonError(
      "Não foi possível validar o cupom.",
      503,
    );
  }
}

export async function POST(request: NextRequest) {
  return withAccountOperation(
    request,
    handlePOST,
  );
}
