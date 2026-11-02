import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Modalidade = "KEEP_CHARGE" | "WAIVE_BALANCE";

type Solicitação = {
  orderId?: unknown;
  mode?: unknown;
  reason?: unknown;
};

function responder(
  conteudo: Record<string, unknown>,
  status: number,
) {
  return NextResponse.json(conteudo, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminUserId = process.env.ADMIN_USER_ID;

  if (
    !supabaseUrl ||
    !anonKey ||
    !serviceKey ||
    !adminUserId
  ) {
    return responder(
      { success: false, error: "Configuração administrativa ausente." },
      503,
    );
  }

  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return responder(
      { success: false, error: "Autenticação necessária." },
      401,
    );
  }

  const token = authorization.slice(7).trim();

  if (!token || token.length > 8192) {
    return responder(
      { success: false, error: "Credencial inválida." },
      401,
    );
  }

  try {
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(token);

    if (
      authError ||
      !user ||
      user.id !== adminUserId
    ) {
      return responder(
        { success: false, error: "Acesso administrativo negado." },
        403,
      );
    }

    let body: Solicitação;

    try {
      body = (await request.json()) as Solicitação;
    } catch {
      return responder(
        { success: false, error: "JSON inválido." },
        400,
      );
    }

    if (!body || typeof body !== "object") {
      return responder(
        { success: false, error: "Dados inválidos." },
        400,
      );
    }

    const orderId = body.orderId;
    const mode = body.mode;

    const reason =
      typeof body.reason === "string"
        ? body.reason.trim()
        : null;

    if (
      typeof orderId !== "string" ||
      !uuidRegex.test(orderId)
    ) {
      return responder(
        { success: false, error: "OS inválida." },
        400,
      );
    }

    if (
      mode !== "KEEP_CHARGE" &&
      mode !== "WAIVE_BALANCE"
    ) {
      return responder(
        { success: false, error: "Modalidade inválida." },
        400,
      );
    }

    if (reason && reason.length > 500) {
      return responder(
        { success: false, error: "Justificativa muito longa." },
        400,
      );
    }

    const adminClient = createClient(
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

    const modalidade: Modalidade = mode;

    const { data, error } = await adminClient.rpc(
      "register_homenageando_admin_music_grant",
      {
        p_order_id: orderId,
        p_actor_id: user.id,
        p_mode: modalidade,
        p_reason: reason,
      },
    );

    if (error) {
      console.error(
        "Erro na concessão administrativa de música:",
        error,
      );

      return responder(
        {
          success: false,
          error: "Não foi possível registrar a operação.",
        },
        503,
      );
    }

    if (!data?.success) {
      return responder(
        {
          success: false,
          error: data?.error ?? "Operação não permitida para esta OS.",
        },
        409,
      );
    }

    return responder(
      {
        success: true,
        orderId,
        mode: modalidade,
        effectiveDueCents: data.effective_due_cents,
      },
      200,
    );
  } catch (error) {
    console.error(
      "Falha inesperada na API administrativa:",
      error,
    );

    return responder(
      {
        success: false,
        error: "Falha interna na operação administrativa.",
      },
      500,
    );
  }
}