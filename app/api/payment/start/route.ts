
import { createHmac } from "node:crypto";
import { withAccountOperation } from "@/lib/account-deletion.mjs";
import { createMercadoPagoPreference, recoverMercadoPagoPreference } from "@/lib/mercadopago-preferences";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const COUPON_REGEX = /^[A-Z0-9_-]{4,40}$/;

type CheckoutResult = {
  success: boolean;
  error?: string;
  orderId?: string;
  orderNumber?: string;
  originalAmountCents?: number;
  discountAmountCents?: number;
  totalAmountCents?: number;
  couponCode?: string | null;
};

type RateLimitResult = {
  allowed: boolean;
  retry_after: number;
};

function fail(message: string, status: number) {
  return NextResponse.json(
    { success: false, error: message },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

async function handlePOST(request: NextRequest) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  const rateSecret =
    process.env.CONTACT_RATE_LIMIT_SECRET;

  const paymentMode =
    process.env.PAYMENT_MODE ?? "disabled";

  if (
    !supabaseUrl ||
    !anonKey ||
    !serviceKey ||
    !rateSecret
  ) {
    return fail(
      "Configuração obrigatória do servidor ausente.",
      503
    );
  }

  if (
    paymentMode !== "test" &&
    paymentMode !== "mercadopago_test" &&
    paymentMode !== "mercadopago_prod"
  ) {
    return fail(
      "Modo de pagamento não configurado.",
      501
    );
  }

  const authorization =
    request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return fail("Usuário não autenticado.", 401);
  }

  const accessToken = authorization
    .slice("Bearer ".length)
    .trim();

  if (
    !accessToken ||
    accessToken.length > 8192
  ) {
    return fail("Sessão inválida.", 401);
  }

  const authClient = createClient(
    supabaseUrl,
    anonKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );

  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser(accessToken);

  if (userError || !user) {
    return fail(
      "Usuário não autenticado.",
      401
    );
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
    }
  );

  const contentLength = Number(
    request.headers.get("content-length") ?? "0"
  );

  if (
    !Number.isFinite(contentLength) ||
    contentLength > 2048
  ) {
    return fail("Solicitação inválida.", 400);
  }

  let body: {
    orderId?: unknown;
    couponCode?: unknown;
  };

  try {
    const raw = await request.text();

    if (
      Buffer.byteLength(raw, "utf8") > 2048
    ) {
      return fail("Solicitação inválida.", 400);
    }

    const parsed: unknown = JSON.parse(raw);

    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return fail("Solicitação inválida.", 400);
    }

    body = parsed;
  } catch {
    return fail("Solicitação inválida.", 400);
  }

  const orderId = body.orderId;

  if (
    typeof orderId !== "string" ||
    !UUID_REGEX.test(orderId)
  ) {
    return fail("Pedido inválido.", 400);
  }

  if (
    body.couponCode !== undefined &&
    body.couponCode !== null &&
    typeof body.couponCode !== "string"
  ) {
    return fail("Cupom inválido.", 400);
  }

  const couponCode = (
    typeof body.couponCode === "string"
      ? body.couponCode
      : ""
  ).trim().toUpperCase();

  if (
    couponCode &&
    !COUPON_REGEX.test(couponCode)
  ) {
    return fail("Cupom inválido.", 400);
  }

  const {
    data: currentOrder,
    error: orderError,
  } = await supabase
    .from("orders")
    .select(
      "id, os_number, state, payment_status, payment_provider, payment_amount_cents, order_number, mercadopago_preference_id, applied_coupon_code, payment_external_id, payment_approved_at"
    )
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (orderError) {
    return fail(
      "Não foi possível consultar o pedido.",
      503
    );
  }

  if (!currentOrder) {
    return fail("Pedido não encontrado.", 404);
  }

  if (
    currentOrder.state === "AGUARDANDO_PAGAMENTO" &&
    currentOrder.payment_status === "PENDING"
  ) {
    const existingCode = (currentOrder.applied_coupon_code ?? "").toUpperCase();
    if (couponCode !== existingCode) {
      if (!couponCode) {
        return fail("Para substituir o cupom, informe e valide um novo código.", 409);
      }
      if (currentOrder.payment_external_id || currentOrder.payment_approved_at) {
        return fail("Existe uma transação registrada para este pedido. Consulte o suporte antes de alterar o desconto.", 409);
      }

      // Troca atômica apenas para cortesia integral. Não reutiliza preferência paga.
      const { data: freeSwap, error: freeSwapError } = await supabase.rpc(
        "complete_homenageando_pending_with_free_coupon",
        { p_order_id: orderId, p_user_id: user.id, p_coupon_code: couponCode },
      );
      if (freeSwapError) {
        console.error("Falha na substituição de cupom integral:", freeSwapError);
        return fail("Não foi possível concluir a troca do cupom com segurança.", 503);
      }
      if (!freeSwap?.success) {
        return fail(freeSwap?.error ?? "Cupom indisponível para substituir o desconto atual.", 409);
      }
      return NextResponse.json({
        success: true,
        paymentMode: "coupon",
        state: freeSwap.state,
        paymentStatus: freeSwap.paymentStatus,
        totalAmountCents: 0,
        discountAmountCents: 3990,
        couponCode: freeSwap.couponCode,
      }, { headers: { "Cache-Control": "no-store" } });
    }
    if (
      paymentMode === "test" &&
      currentOrder.payment_provider === "TEST"
    ) {
      return NextResponse.json({
        success: true,
        paymentMode,
        state: currentOrder.state,
        paymentStatus:
          currentOrder.payment_status,
        order: currentOrder,
      });
    }

    if (
      (paymentMode === "mercadopago_test" || paymentMode === "mercadopago_prod") &&
      currentOrder.payment_provider === (paymentMode === "mercadopago_prod" ? "MERCADO_PAGO_PROD" : "MERCADO_PAGO_TEST")
    ) {
      const amount = currentOrder.payment_amount_cents;

       if (
        !Number.isSafeInteger(amount) ||
        amount < 1 ||
        amount > 3990
      ) {
        return fail("Valor do pedido pendente inválido.", 409);
      }

      try {
        const recovered = await recoverMercadoPagoPreference(
          orderId,
          amount,
          currentOrder.mercadopago_preference_id,
        );

        if (!recovered) {
          return fail(
            "O checkout anterior ainda não pôde ser localizado. Nenhuma nova preferência foi criada.",
            409
          );
        }

        if (!currentOrder.mercadopago_preference_id) {
          const { data: saved, error: saveError } =
            await supabase
              .from("orders")
              .update({
                mercadopago_preference_id: recovered.id,
              })
              .eq("id", orderId)
              .eq("user_id", user.id)
              .eq("state", "AGUARDANDO_PAGAMENTO")
              .eq("payment_status", "PENDING")
              .eq("payment_provider", paymentMode === "mercadopago_prod" ? "MERCADO_PAGO_PROD" : "MERCADO_PAGO_TEST")
              .is("mercadopago_preference_id", null)
              .select("id")
              .maybeSingle();

          if (saveError || !saved) {
            return fail(
              "Não foi possível registrar a preferência recuperada.",
              503
            );
          }
        }

        // Confere novamente o pedido depois da consulta externa.
        const { data: latestOrder, error: latestError } =
          await supabase
            .from("orders")
            .select(
              "id, state, payment_status, payment_provider, payment_amount_cents, mercadopago_preference_id"
            )
            .eq("id", orderId)
            .eq("user_id", user.id)
            .maybeSingle();

        if (latestError || !latestOrder) {
          return fail(
            "Não foi possível confirmar o estado atual do pedido.",
            503
          );
        }

        if (
          latestOrder.state !== "AGUARDANDO_PAGAMENTO" ||
          latestOrder.payment_status !== "PENDING" ||
          latestOrder.payment_provider !== (paymentMode === "mercadopago_prod" ? "MERCADO_PAGO_PROD" : "MERCADO_PAGO_TEST") ||
          latestOrder.payment_amount_cents !== amount ||
          latestOrder.mercadopago_preference_id !== recovered.id
        ) {
          return fail(
            "O estado do pagamento foi alterado. Atualize a página para consultar o pedido.",
            409
          );
        }

        return NextResponse.json({
          success: true,
          paymentMode,
          state: latestOrder.state,
          paymentStatus: latestOrder.payment_status,
          totalAmountCents: amount,
          preferenceId: recovered.id,
          checkoutUrl: recovered.checkoutUrl,
          recovered: true,
          order: latestOrder,
        });
      } catch (error) {
        console.error(
          "Falha na recuperação da preferência:",
          error
        );

        return fail(
          "Não foi possível recuperar o checkout com segurança. O pedido permanece pendente.",
          503
        );
      }
    }

    return fail(
      "Já existe um pagamento iniciado para este pedido.",
      409
    );
  }

  if (
    currentOrder.state !== "MUSICA_1_PREVIEW"
  ) {
    return fail(
      "Este pedido não está disponível para iniciar pagamento.",
      409
    );
  }

  if (
    (paymentMode === "mercadopago_test" || paymentMode === "mercadopago_prod") &&
    !user.email
  ) {
    return fail(
      "O usuário precisa ter um e-mail cadastrado.",
      400
    );
  }

  const publicBaseUrl =
    process.env.MERCADOPAGO_PUBLIC_BASE_URL;

  const webhookUrl =
    process.env.MERCADOPAGO_WEBHOOK_URL;

  if (paymentMode === "mercadopago_test" || paymentMode === "mercadopago_prod") {
    try {
      if (!publicBaseUrl || !webhookUrl) {
        throw new Error("URLs ausentes");
      }

      if (
        new URL(publicBaseUrl).protocol !== "https:" ||
        new URL(webhookUrl).protocol !== "https:"
      ) {
        throw new Error("HTTPS obrigatório");
      }
    } catch {
      return fail(
        "URLs públicas do Mercado Pago não configuradas corretamente.",
        503
      );
    }
  }

  // Proteção contra requisições excessivas.
  // Reutiliza o mecanismo de limite já instalado.
  const keyHash = createHmac(
    "sha256",
    rateSecret
  )
    .update(`payment-start:${user.id}`)
    .digest("hex");

  const {
    data: rateData,
    error: rateError,
  } = await supabase.rpc(
    "consume_contact_rate_limit",
    {
      p_scope: "email",
      p_key_hash: keyHash,
    }
  );

  if (
    rateError ||
    !Array.isArray(rateData) ||
    !rateData[0]
  ) {
    return fail(
      "Não foi possível verificar o limite de solicitações.",
      503
    );
  }

  const rateLimit =
    rateData[0] as RateLimitResult;

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Muitas tentativas. Tente novamente mais tarde.",
      },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(
            Math.max(
              1,
              Math.ceil(rateLimit.retry_after)
            )
          ),
        },
      }
    );
  }

  const paymentProvider =
    paymentMode === "test"
      ? "TEST"
      : paymentMode === "mercadopago_prod"
        ? "MERCADO_PAGO_PROD"
        : "MERCADO_PAGO_TEST";

  // O banco calcula o desconto e reserva
  // a utilização do cupom atomicamente.
  const {
    data: checkoutData,
    error: checkoutError,
  } = await supabase.rpc(
    "begin_homenageando_checkout",
    {
      p_order_id: orderId,
      p_user_id: user.id,
      p_coupon_code: couponCode,
      p_provider: paymentProvider,
    }
  );

  if (checkoutError) {
    console.error(
      "Falha na preparação do checkout:",
      checkoutError
    );

    return fail(
      "Não foi possível iniciar o pagamento.",
      503
    );
  }

  const checkout =
    checkoutData as CheckoutResult | null;

  if (
    !checkout?.success ||
    !checkout.orderNumber ||
    !Number.isInteger(
      checkout.totalAmountCents
    ) ||
    !Number.isInteger(
      checkout.discountAmountCents
    ) ||
    checkout.originalAmountCents !== 3990 ||
    checkout.totalAmountCents! < 0 ||
    checkout.totalAmountCents! > 3990 ||
    checkout.discountAmountCents! < 0 ||
    checkout.discountAmountCents! +
      checkout.totalAmountCents! !== 3990
  ) {
    return fail(
      checkout?.error ??
        "Não foi possível preparar o pedido.",
      409
    );
  }

  const {
    data: updatedOrder,
    error: updatedOrderError,
  } = await supabase
    .from("orders")
    .select(
      "id, os_number, state, payment_status, payment_provider, payment_amount_cents"
    )
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (updatedOrderError || !updatedOrder) {
    return fail(
      "Não foi possível consultar o pagamento iniciado.",
      503
    );
  }

  // Desconto integral:
  // não cria cobrança no Mercado Pago.
  if (checkout.totalAmountCents === 0) {
    const {
      data: freeData,
      error: freeError,
    } = await supabase.rpc(
      "complete_homenageando_free_coupon",
      {
        p_order_id: orderId,
        p_user_id: user.id,
      }
    );

    if (
      freeError ||
      !freeData?.success
    ) {
      console.error(
        "Falha na finalização da cortesia:",
        freeError
      );

      return fail(
        "A cortesia foi reservada, mas ainda não foi concluída. Não inicie outro pedido.",
        503
      );
    }

    return NextResponse.json({
      success: true,
      paymentMode: "coupon",
      state: freeData.state,
      paymentStatus: freeData.paymentStatus,
      totalAmountCents: 0,
      discountAmountCents:
        checkout.discountAmountCents,
      couponCode: checkout.couponCode,
      order: {
        ...updatedOrder,
        state: freeData.state,
        payment_status: freeData.paymentStatus,
        payment_provider: "COUPON_100",
        payment_amount_cents: 0,
      },
    });
  }

  if (paymentMode === "test") {
    return NextResponse.json({
      success: true,
      paymentMode,
      state: updatedOrder.state,
      paymentStatus:
        updatedOrder.payment_status,
      totalAmountCents:
        checkout.totalAmountCents,
      discountAmountCents:
        checkout.discountAmountCents,
      couponCode: checkout.couponCode,
      order: updatedOrder,
    });
  }

  try {
    const preference =
      await createMercadoPagoPreference({
        orderId,
        orderNumber: checkout.orderNumber,
        buyerEmail: user.email!,
        baseUrl: publicBaseUrl!,
        notificationUrl: webhookUrl!,
        totalAmountCents:
          checkout.totalAmountCents!,
      });

    const { data: saved, error: saveError } =
      await supabase
        .from("orders")
        .update({
          mercadopago_preference_id: preference.id,
        })
        .eq("id", orderId)
        .eq("user_id", user.id)
        .eq("state", "AGUARDANDO_PAGAMENTO")
        .eq("payment_status", "PENDING")
        .eq("payment_provider", paymentMode === "mercadopago_prod" ? "MERCADO_PAGO_PROD" : "MERCADO_PAGO_TEST")
        .is("mercadopago_preference_id", null)
        .select("id")
        .maybeSingle();

    if (saveError || !saved) {
      throw new Error(
        "Não foi possível registrar a preferência no Supabase."
      );
    }

    return NextResponse.json({
      success: true,
      paymentMode,
      state: updatedOrder.state,
      paymentStatus:
        updatedOrder.payment_status,
      totalAmountCents:
        checkout.totalAmountCents,
      discountAmountCents:
        checkout.discountAmountCents,
      couponCode: checkout.couponCode,
      preferenceId: preference.id,
      checkoutUrl: preference.init_point,
      order: updatedOrder,
    });
  } catch (error) {
    console.error(
      "Erro ao criar preferência Mercado Pago:",
      error
    );

    // Não reverte automaticamente:
    // a preferência pode ter sido criada
    // antes de uma falha de comunicação.
    return fail(
      "Não foi possível concluir a preparação do checkout. O pedido permanece pendente para verificação.",
      502
    );
  }
}

export async function POST(
  request: NextRequest
) {
  return withAccountOperation(
    request,
    handlePOST
  );
}
