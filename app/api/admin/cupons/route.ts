import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CouponAction = "list" | "create" | "toggle";

function respond(data: Record<string, unknown>, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function execute(request: NextRequest, action: CouponAction) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminId = process.env.ADMIN_USER_ID;
  if (!url || !anonKey || !serviceKey || !adminId) {
    return respond({ success: false, error: "Configuração administrativa incompleta." }, 503);
  }

  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    return respond({ success: false, error: "Não autenticado." }, 401);
  }
  const token = authorization.slice(7).trim();
  if (!token || token.length > 8192) {
    return respond({ success: false, error: "Sessão inválida." }, 401);
  }

  const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
  try {
    const authClient = createClient(url, anonKey, options);
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    if (authError || !user) return respond({ success: false, error: "Sessão inválida." }, 401);
    if (user.id !== adminId) return respond({ success: false, error: "Acesso não autorizado." }, 403);

    let payload: Record<string, unknown> = {};
    if (action !== "list") {
      let body: unknown;
      try { body = await request.json(); } catch { return respond({ success: false, error: "JSON inválido." }, 400); }
      if (!body || typeof body !== "object" || Array.isArray(body)) {
        return respond({ success: false, error: "Dados inválidos." }, 400);
      }
      payload = body as Record<string, unknown>;
    }

    if (action === "create") {
      const code = typeof payload.code === "string" ? payload.code.trim().toUpperCase() : "";
      const percent = payload.discount_percent;
      const fixed = payload.discount_fixed_cents;
      const hasPercent = payload.discount_percent !== null && payload.discount_percent !== undefined;
      const hasFixed = payload.discount_fixed_cents !== null && payload.discount_fixed_cents !== undefined;
      const hasFinal = payload.final_amount_cents !== null && payload.final_amount_cents !== undefined;
      const kinds = Number(hasPercent) + Number(hasFixed) + Number(hasFinal);
      if (!/^[A-Z0-9_-]{4,40}$/.test(code) || kinds !== 1 ||
          (hasPercent && (!Number.isInteger(payload.discount_percent) || Number(payload.discount_percent) < 1 || Number(payload.discount_percent) > 100)) ||
          (hasFixed && (!Number.isInteger(payload.discount_fixed_cents) || Number(payload.discount_fixed_cents) < 1 || Number(payload.discount_fixed_cents) > 3990))) {
        return respond({ success: false, error: "Código ou modalidade de desconto inválidos." }, 400);
      }
      if (hasFinal && (!Number.isInteger(payload.final_amount_cents) || Number(payload.final_amount_cents) <= 0 || Number(payload.final_amount_cents) >= 3990)) {
        return respond({ success: false, error: Number(payload.final_amount_cents) === 0
          ? "O valor final deve ser maior que R$ 0,00. Para oferecer gratuitamente, selecione Percentual (%) e informe 100%."
          : "O valor final deve ser maior que zero e menor que o valor da compra." }, 400);
      }
      payload.code = code;
      if (!Number.isInteger(payload.max_redemptions) || (payload.max_redemptions as number) < 1 || (payload.max_redemptions as number) > 100000) {
        return respond({ success: false, error: "Limite de utilizações inválido." }, 400);
      }
      if (!Number.isInteger(payload.per_user_limit) || (payload.per_user_limit as number) < 1 || (payload.per_user_limit as number) > (payload.max_redemptions as number)) {
        return respond({ success: false, error: "Limite por usuário inválido." }, 400);
      }
      if (typeof payload.expires_at !== "string" || !Number.isFinite(Date.parse(payload.expires_at))) {
        return respond({ success: false, error: "Data de expiração inválida." }, 400);
      }
    }
    if (action === "toggle" && (typeof payload.id !== "string" || typeof payload.active !== "boolean")) {
      return respond({ success: false, error: "Cupom ou estado inválido." }, 400);
    }

    // A RPC e executável exclusivamente pelo papel service_role.
    const db = createClient(url, serviceKey, options);
    const { data, error } = await db.rpc("admin_coupon_management", {
      p_action: action,
      p_payload: { ...payload, actor_id: user.id },
    });
    if (error) {
      console.error("Admin cupons RPC:", { code: error.code, message: error.message });
      return respond({ success: false, error: "Não foi possível executar a operação de cupons." }, 503);
    }
    if (!data || typeof data !== "object") {
      return respond({ success: false, error: "Resposta administrativa inválida." }, 503);
    }
    return respond(data as Record<string, unknown>);
  } catch (error) {
    console.error("Admin cupons:", error);
    return respond({ success: false, error: "Falha ao processar a solicitação." }, 503);
  }
}

export async function GET(request: NextRequest) { return execute(request, "list"); }
export async function POST(request: NextRequest) { return execute(request, "create"); }
export async function PATCH(request: NextRequest) { return execute(request, "toggle"); }
