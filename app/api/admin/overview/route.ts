
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function respostaErro(mensagem: string, status: number) {
  return NextResponse.json(
    { success: false, error: mensagem },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminUserId = process.env.ADMIN_USER_ID;

  if (!supabaseUrl || !anonKey || !serviceKey || !adminUserId) {
    return respostaErro("Configuração administrativa incompleta.", 503);
  }

  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return respostaErro("Não autenticado.", 401);
  }

  const token = authorization.slice(7).trim();

  if (!token || token.length > 8192) {
    return respostaErro("Sessão inválida.", 401);
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser(token);

  if (userError || !user) {
    return respostaErro("Sessão inválida.", 401);
  }

  if (user.id !== adminUserId) {
    return respostaErro("Acesso não autorizado.", 403);
  }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  try {
    const [
      total,
      elaboracao,
      geracao,
      abandonadas,
      pendentes,
      entregues,
    ] = await Promise.all([
      adminClient
        .from("orders")
        .select("id", { count: "exact", head: true }),

      adminClient
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("state", "QUESTIONÁRIO_ABERTO"),

      adminClient
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("state", "GERANDO_MUSICA_1"),

      adminClient
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("state", "MUSICA_1_PREVIEW")
        .neq("payment_status", "APPROVED"),

      adminClient
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("state", "AGUARDANDO_PAGAMENTO")
        .eq("payment_status", "PENDING"),

      adminClient
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("state", "MUSICA_1_DISPONIVEL")
        .eq("payment_status", "APPROVED"),
    ]);

    const resultados = [
      total,
      elaboracao,
      geracao,
      abandonadas,
      pendentes,
      entregues,
    ];

    const erroConsulta = resultados.find((resultado) => resultado.error);

    if (erroConsulta?.error) {
      console.error(
        "Erro ao consultar indicadores administrativos:",
        erroConsulta.error
      );

      return respostaErro("Não foi possível consultar os indicadores.", 503);
    }

    return NextResponse.json(
      {
        success: true,
        indicadores: {
          totalPedidos: total.count ?? 0,
          questionariosAbertos: elaboracao.count ?? 0,
          emGeracao: geracao.count ?? 0,
          musicasAbandonadas: abandonadas.count ?? 0,
          pagamentosPendentes: pendentes.count ?? 0,
          musicasEntregues: entregues.count ?? 0,
        },
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("Erro no painel administrativo:", error);

    return respostaErro(
      "O painel está temporariamente indisponível.",
      503
    );
  }
}
