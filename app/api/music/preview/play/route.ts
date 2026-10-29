import { withAccountOperation } from "@/lib/account-deletion.mjs";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

async function handlePOST(request: NextRequest) {
  const json = (body: unknown, status = 200) =>
    NextResponse.json(body, {
      status,
      headers: { "Cache-Control": "no-store" },
    });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const musicGenerationMode =
    process.env.MUSIC_GENERATION_MODE ?? "test";

  // Limite de reproduções por pedido.
  const previewPlayLimit = 5;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return json({ error: "Configuração do serviço ausente." }, 500);
  }

  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return json({ error: "Usuário não autenticado." }, 401);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return json({ error: "Pedido inválido." }, 400);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return json({ error: "Pedido inválido." }, 400);
  }

  const orderId = (body as Record<string, unknown>).orderId;
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (typeof orderId !== "string" || !uuidPattern.test(orderId)) {
    return json({ error: "Pedido inválido." }, 400);
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authorization },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(authorization.slice(7));

    if (userError || !user) {
      return json({ error: "Usuário não autenticado." }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const { data: currentOrder, error: currentOrderError } =
      await adminClient
        .from("orders")
        .select("id, state, preview_play_count, preview_1_storage_path")
        .eq("id", orderId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (currentOrderError) {
      return json({ error: "Não foi possível consultar o pedido." }, 500);
    }

    if (!currentOrder) {
      return json({ error: "Pedido não encontrado." }, 404);
    }

    if (currentOrder.state !== "MUSICA_1_PREVIEW") {
      return json(
        { error: "O preview não está disponível para este pedido." },
        409,
      );
    }

    if (currentOrder.preview_play_count >= previewPlayLimit) {
      return json(
        {
          error: "O limite de reproduções do preview foi atingido.",
          previewPlayCount: currentOrder.preview_play_count,
          previewPlayLimit,
        },
        409,
      );
    }

    let previewUrl: string | null = null;
    let simulated = false;

    const previewPath = currentOrder.preview_1_storage_path;

    if (typeof previewPath === "string" && previewPath.trim()) {
      // O caminho vem do banco, nunca da requisição do navegador.
      if (
        !previewPath.startsWith(`${user.id}/${orderId}/`) ||
        !previewPath.endsWith("/preview-1.mp3")
      ) {
        return json(
          { error: "O arquivo de preview exige verificação." },
          409,
        );
      }

      const { data: signedPreview, error: signedPreviewError } =
        await adminClient.storage
          .from("homenageando-audio")
          .createSignedUrl(previewPath, 120);

      if (signedPreviewError || !signedPreview?.signedUrl) {
        return json(
          { error: "Não foi possível disponibilizar o preview agora." },
          502,
        );
      }

      previewUrl = signedPreview.signedUrl;
    } else if (musicGenerationMode === "test") {
      simulated = true;
    } else {
      return json(
        { error: "O áudio do preview ainda não está disponível." },
        409,
      );
    }

    // A RPC preserva a contagem atômica e o bloqueio concorrente.
    const { data: previewPlayResult, error: previewPlayError } =
      await supabase.rpc("consume_preview_play", {
        p_order_id: orderId,
      });

    if (previewPlayError) {
      return json(
        { error: "Não foi possível iniciar a reprodução do preview." },
        500,
      );
    }

    const consumedPlay = previewPlayResult?.[0];

    if (!consumedPlay) {
      return json(
        {
          error:
            "O limite de reproduções foi atingido ou o preview não está mais disponível.",
        },
        409,
      );
    }

    // Só entrega a URL após a autorização da reprodução pela RPC.
    return json({
      success: true,
      simulated,
      previewUrl,
      previewPlayCount: consumedPlay.preview_play_count,
      previewPlayLimit,
    });
  } catch {
    return json(
      { error: "Não foi possível iniciar o preview agora." },
      500,
    );
  }
}

export async function POST(request: NextRequest) {
  return withAccountOperation(request, handlePOST);
}