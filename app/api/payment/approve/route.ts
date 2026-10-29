
import { withAccountOperation } from "@/lib/account-deletion.mjs";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ApprovalResult = {
  success: boolean;
  error?: string;
  state?: string;
  paymentStatus?: string;
  alreadyApproved?: boolean;
};

function fail(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

async function handlePOST(request: NextRequest) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  const paymentMode =
    process.env.PAYMENT_MODE ?? "disabled";

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return fail(
      "Configuração do Supabase ausente.",
      503,
    );
  }

  if (paymentMode !== "test") {
    return fail(
      "Aprovação simulada disponível somente em modo de teste.",
      501,
    );
  }

  const authorization =
    request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return fail(
      "Usuário não autenticado.",
      401,
    );
  }

  const accessToken = authorization
    .slice("Bearer ".length)
    .trim();

  if (!accessToken || accessToken.length > 8192) {
    return fail(
      "Sessão inválida.",
      401,
    );
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
    },
  );

  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser(accessToken);

  if (userError || !user) {
    return fail(
      "Sessão inválida ou expirada.",
      401,
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
    },
  );

  const contentLength = Number(
    request.headers.get("content-length") ?? "0",
  );

  if (
    !Number.isFinite(contentLength) ||
    contentLength > 2048
  ) {
    return fail(
      "Solicitação inválida.",
      400,
    );
  }

  let body: {
    orderId?: unknown;
  };

  try {
    const rawBody = await request.text();

    if (
      Buffer.byteLength(rawBody, "utf8") > 2048
    ) {
      return fail(
        "Solicitação inválida.",
        400,
      );
    }

    const parsed: unknown = JSON.parse(rawBody);

    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return fail(
        "Solicitação inválida.",
        400,
      );
    }

    body = parsed;
  } catch {
    return fail(
      "Solicitação inválida.",
      400,
    );
  }

  if (
    typeof body.orderId !== "string" ||
    !UUID_REGEX.test(body.orderId)
  ) {
    return fail(
      "Pedido inválido.",
      400,
    );
  }

  const orderId = body.orderId;

  // Confere se o pedido pertence ao usuário.
  const {
    data: currentOrder,
    error: orderError,
  } = await supabase
    .from("orders")
    .select(
      "id, user_id, state, payment_status, payment_provider",
    )
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (orderError) {
    console.error(
      "[payment/approve] Falha ao consultar pedido:",
      orderError,
    );

    return fail(
      "Não foi possível consultar o pedido.",
      503,
    );
  }

  if (!currentOrder) {
    return fail(
      "Pedido não encontrado.",
      404,
    );
  }

  if (currentOrder.payment_provider !== "TEST") {
    return fail(
      "Este pedido não permite aprovação simulada.",
      409,
    );
  }

  // Aprovação e consumo do cupom são efetuados
  // atomicamente no Supabase.
  const {
    data: approvalData,
    error: approvalError,
  } = await supabase.rpc(
    "approve_homenageando_test_payment",
    {
      p_order_id: orderId,
      p_user_id: user.id,
    },
  );

  if (approvalError) {
    console.error(
      "[payment/approve] Erro na aprovação:",
      approvalError,
    );

    return fail(
      "Não foi possível concluir a aprovação.",
      503,
    );
  }

  const approval =
    approvalData as ApprovalResult | null;

  if (!approval?.success) {
    return fail(
      approval?.error ??
        "Pedido não disponível para aprovação.",
      409,
    );
  }

  // Retorna o registro atualizado depois
  // da transação concluída no banco.
  const {
    data: updatedOrder,
    error: updatedOrderError,
  } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (updatedOrderError || !updatedOrder) {
    console.error(
      "[payment/approve] Falha ao consultar pedido aprovado:",
      updatedOrderError,
    );

    return fail(
      "Pagamento aprovado, mas não foi possível consultar o pedido atualizado.",
      503,
    );
  }

  return NextResponse.json(
    {
      success: true,
      paymentMode,
      state: updatedOrder.state,
      paymentStatus: updatedOrder.payment_status,
      alreadyApproved:
        approval.alreadyApproved === true,
      order: updatedOrder,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function POST(request: NextRequest) {
  return withAccountOperation(
    request,
    handlePOST,
  );
}
