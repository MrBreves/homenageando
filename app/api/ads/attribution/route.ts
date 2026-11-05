import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VALID_REF = /^[A-Za-z0-9._~%+=/-]{1,1024}$/;

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const token = authorization.slice(7).trim();
  if (!token || token.length > 8192) {
    return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return NextResponse.json({ error: "Configuração indisponível" }, { status: 503 });
  }
  let parsed: unknown;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > 1600) {
      return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
    }
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const body = parsed as Record<string, unknown>;
  if (
    typeof body.orderId !== "string" || !UUID.test(body.orderId) ||
    typeof body.oppref !== "string" || !VALID_REF.test(body.oppref) ||
    body.measurementConsent !== true
  ) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const auth = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await auth.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: order, error: orderError } = await admin
    .from("orders").select("id").eq("id", body.orderId)
    .eq("user_id", user.id).neq("payment_status", "APPROVED").maybeSingle();
  if (orderError) {
    return NextResponse.json({ error: "Indisponível" }, { status: 503 });
  }
  if (!order) {
    return NextResponse.json({ error: "Pedido indisponível" }, { status: 404 });
  }

  const { error } = await admin.rpc("record_openai_ads_order_attribution", {
    p_order_id: order.id,
    p_oppref: body.oppref,
  });
  if (error) {
    console.warn("[OpenAI Ads] Falha ao registrar referência de anúncio.");
    return NextResponse.json({ error: "Indisponível" }, { status: 503 });
  }
  return NextResponse.json({ success: true }, {
    headers: { "Cache-Control": "no-store" },
  });
}
