import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function falha(mensagem: string, status: number) {
  return NextResponse.json(
    { success: false, error: mensagem },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminId = process.env.ADMIN_USER_ID;

  if (!url || !anon || !service || !adminId) {
    return falha("Configuração administrativa incompleta.", 503);
  }

  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return falha("Não autenticado.", 401);
  }

  const token = authorization.slice(7).trim();

  if (!token || token.length > 8192) {
    return falha("Sessão inválida.", 401);
  }

  try {
    const auth = createClient(url, anon, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const {
      data: { user },
      error: authError,
    } = await auth.auth.getUser(token);

    if (authError || !user) {
      return falha("Sessão inválida.", 401);
    }

    if (user.id !== adminId) {
      return falha("Acesso não autorizado.", 403);
    }

    const db = createClient(url, service, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const { data: pedidos, error: pedidosError } = await db
      .from("orders")
      .select(
        [
          "id",
          "user_id",
          "os_number",
          "questionnaire",
          "state",
          "created_at",
          "updated_at",
          "payment_status",
          "payment_provider",
          "payment_amount_cents",
          "payment_approved_at",
          "original_amount_cents",
          "discount_amount_cents",
          "applied_coupon_code",
          "music_1_storage_path",
          "preview_1_storage_path",
          "lyrics_1",
        ].join(",")
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (pedidosError) {
      console.error("Admin - pedidos:", pedidosError);
      return falha("Erro ao consultar pedidos.", 503);
    }

    const registros = (pedidos ?? []) as unknown as Array<{
      id: string;
      user_id: string;
      os_number: number | null;
      questionnaire: Record<string, unknown> | null;
      state: string;
      created_at: string;
      updated_at: string;
      payment_status: string | null;
      payment_provider: string | null;
      payment_amount_cents: number | null;
      payment_approved_at: string | null;
      original_amount_cents: number | null;
      discount_amount_cents: number | null;
      applied_coupon_code: string | null;
      music_1_storage_path: string | null;
      preview_1_storage_path: string | null;
      lyrics_1: string | null;
    }>;

    const ids = [...new Set(registros.map((p) => p.user_id))];

    const perfis = new Map<
      string,
      { celular_1: string | null; celular_2: string | null }
    >();

    const usuarios = new Map<
      string,
      { nome: string | null; email: string | null }
    >();

    if (ids.length > 0) {
      const { data: dadosPerfis, error: perfisError } = await db
        .from("profiles")
        .select("id, celular_1, celular_2")
        .in("id", ids);

      if (perfisError) {
        console.error("Admin - perfis:", {
          message: perfisError.message,
          code: perfisError.code,
          details: perfisError.details,
          hint: perfisError.hint,
        });
      } else {
        for (const perfil of dadosPerfis ?? []) {
          perfis.set(perfil.id, {
            celular_1: perfil.celular_1,
            celular_2: perfil.celular_2,
          });
        }
      }

      const resultados = await Promise.all(
        ids.map(async (id) => {
          const { data, error } = await db.auth.admin.getUserById(id);

          return { id, usuario: data.user, error };
        })
      );

      for (const resultado of resultados) {
        if (resultado.error) {
          console.error(
            "Admin - usuário:",
            resultado.id,
            resultado.error
          );
          continue;
        }

        const usuario = resultado.usuario;
        const metadata = usuario?.user_metadata;
        const nomeMetadata =
          typeof metadata?.nome === "string"
            ? metadata.nome
            : typeof metadata?.full_name === "string"
              ? metadata.full_name
              : null;

        usuarios.set(resultado.id, {
          nome: nomeMetadata,
          email: usuario?.email ?? null,
        });
      }
    }

    const resultado = registros.map((pedido) => {
      const questionario = pedido.questionnaire ?? {};
      const cadastro = usuarios.get(pedido.user_id);
      const contato = perfis.get(pedido.user_id);

      const tituloQuestionario =
        typeof questionario.tituloMusica === "string"
          ? questionario.tituloMusica.trim()
          : "";

      const primeiraLinha = (pedido.lyrics_1 ?? "")
        .split(/\r?\n|\\n/)[0]
        .trim();

      const tituloLetra =
        primeiraLinha.match(/^\*\*(.+?)\*\*$/)?.[1]?.trim() ?? "";

      const titulo =
        tituloQuestionario ||
        tituloLetra ||
        `Música da OS ${pedido.os_number ?? "—"}`;

      const nomeQuestionario =
        typeof questionario.nomeUsuario === "string"
          ? questionario.nomeUsuario.trim()
          : "";

      const naoPago = pedido.payment_status !== "APPROVED";

      const abandonada =
        naoPago &&
        (pedido.state === "MUSICA_1_PREVIEW" ||
          pedido.state === "AGUARDANDO_PAGAMENTO") &&
        Boolean(pedido.preview_1_storage_path);

      return {
        ...pedido,
        titulo,
        cliente_nome:
          cadastro?.nome || nomeQuestionario || "Nome não informado",
        cliente_email: cadastro?.email ?? null,
        celular_1: contato?.celular_1 ?? null,
        celular_2: contato?.celular_2 ?? null,
        abandonada,
      };
    });

    return NextResponse.json(
      {
        success: true,
        pedidos: resultado,
        limitadoA: 200,
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("Admin - erro geral:", error);
    return falha("Erro ao carregar dados administrativos.", 503);
  }
}