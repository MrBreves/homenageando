import { withAccountOperation } from "@/lib/account-deletion.mjs";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { storeGeneratedMusic } from "@/lib/store-generated-music";

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
  const kieApiKey = process.env.KIE_API_KEY;
  const generationMode = process.env.MUSIC_GENERATION_MODE ?? "test";

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return json({ error: "Configuração do serviço ausente." }, 500);
  }

  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return json({ error: "Usuário não autenticado." }, 401);
  }

  const orderId = request.nextUrl.searchParams.get("orderId");
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!orderId || !uuidPattern.test(orderId)) {
    return json({ error: "Solicitação inválida." }, 400);
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } },
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

    const { data: order, error } = await adminClient
      .from("orders")
      .select("state, preview_play_count, payment_status, kie_task_id")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return json({ error: "Não foi possível consultar a solicitação." }, 500);
    }

    if (!order) {
      return json({ error: "Solicitação não encontrada." }, 404);
    }

    const status = {
      state: order.state,
      preview_play_count: order.preview_play_count,
      payment_status: order.payment_status,
    };

    if (
      order.state !== "GERANDO_MUSICA_1" ||
      generationMode === "test"
    ) {
      return json(status);
    }

    if (!order.kie_task_id) {
      return json({
        ...status,
        message: "Aguardando a confirmação do envio da sua música.",
      });
    }

    if (!kieApiKey?.trim()) {
      return json({ error: "Configuração da geração musical ausente." }, 500);
    }

    const taskUrl = new URL(
      "https://api.kie.ai/api/v1/jobs/recordInfo",
    );
    taskUrl.searchParams.set("taskId", order.kie_task_id);

    const response = await fetch(taskUrl, {
      headers: { Authorization: `Bearer ${kieApiKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });

    const body: unknown = await response.json();

    if (
      !response.ok ||
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      throw new Error("Consulta musical indisponível.");
    }

    const result = body as Record<string, unknown>;

    if (
      result.code !== 200 ||
      typeof result.data !== "object" ||
      result.data === null ||
      Array.isArray(result.data)
    ) {
      throw new Error("Resposta musical inválida.");
    }

    const task = result.data as Record<string, unknown>;

    if (task.taskId !== order.kie_task_id) {
      throw new Error("Tarefa musical divergente.");
    }

    if (task.state === "fail") {
      return json({
        ...status,
        continuePolling: false,
        message:
          "Não foi possível concluir sua música. Sua solicitação foi preservada para verificação.",
      });
    }

    if (task.state === "success") {
      if (typeof task.resultJson !== "string") {
        throw new Error("Resultado musical ausente.");
      }

      const parsed: unknown = JSON.parse(task.resultJson);

      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        throw new Error("Resultado musical inválido.");
      }

      const musicResult = parsed as Record<string, unknown>;

      if (
        musicResult.code !== 200 ||
        musicResult.task_id !== order.kie_task_id ||
        !Array.isArray(musicResult.data)
      ) {
        console.error("[MUSIC_RESULT_FORMAT]", {
          keys: Object.keys(musicResult),
          resultObjectType: typeof musicResult.resultObject,
          resultObjectKeys:
            typeof musicResult.resultObject === "object" &&
            musicResult.resultObject !== null &&
            !Array.isArray(musicResult.resultObject)
              ? Object.keys(musicResult.resultObject)
              : [],
          lyricsDataType:
            typeof (
              musicResult.resultObject as Record<string, unknown>
            )?.lyricsData,
          lyricsDataIsArray:
            Array.isArray(
              (
                musicResult.resultObject as Record<string, unknown>
              )?.lyricsData
            ),
          lyricsDataFirstItemKeys:
            Array.isArray(
              (
                musicResult.resultObject as Record<string, unknown>
              )?.lyricsData
            )
              ? Object.keys(
                  (
                    (
                      musicResult.resultObject as Record<string, unknown>
                    ).lyricsData as unknown[]
                  )[0] ?? {}
                )
              : [],
          code: musicResult.code,
          taskIdMatches:
            musicResult.task_id === order.kie_task_id,
          dataIsArray: Array.isArray(musicResult.data),
          resultUrlsIsArray: Array.isArray(musicResult.resultUrls),
          resultUrlsCount: Array.isArray(musicResult.resultUrls)
            ? musicResult.resultUrls.length
            : null,
        });

        throw new Error("Resultado incompatível com a tarefa.");
      }

      let audioUrl: URL | null = null;

      for (const item of musicResult.data) {
        if (
          typeof item !== "object" ||
          item === null ||
          Array.isArray(item)
        ) {
          continue;
        }

        const track = item as Record<string, unknown>;

        if (
          typeof track.audio_url !== "string" ||
          typeof track.duration !== "number" ||
          !Number.isFinite(track.duration) ||
          track.duration < 35
        ) {
          continue;
        }

        try {
          const candidate = new URL(track.audio_url);

          if (
            candidate.protocol === "https:" &&
            candidate.hostname === "tempfile.aiquickdraw.com" &&
            candidate.port === "" &&
            candidate.username === "" &&
            candidate.password === "" &&
            candidate.pathname.startsWith("/r/") &&
            candidate.pathname.toLowerCase().endsWith(".mp3")
          ) {
            audioUrl = candidate;
            break;
          }
        } catch {
          continue;
        }
      }

      if (!audioUrl) {
        throw new Error("Nenhum áudio válido disponível.");
      }

      const audioResponse = await fetch(audioUrl, {
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(60000),
      });

      if (!audioResponse.ok || !audioResponse.body) {
        throw new Error("Não foi possível baixar o áudio.");
      }

      const maximumBytes = 50 * 1024 * 1024;
      const declaredSize = Number(
        audioResponse.headers.get("content-length") ?? "0",
      );

      if (declaredSize > maximumBytes) {
        await audioResponse.body.cancel();
        throw new Error("O áudio ultrapassa o tamanho permitido.");
      }

      const reader = audioResponse.body.getReader();
      const chunks: Buffer[] = [];
      let receivedBytes = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          receivedBytes += value.byteLength;

          if (receivedBytes > maximumBytes) {
            throw new Error("O áudio ultrapassa o tamanho permitido.");
          }

          chunks.push(Buffer.from(value));
        }
      } finally {
        try {
          await reader.cancel();
        } catch {
          // A conexão pode já ter sido encerrada pelo timeout.
        }

        reader.releaseLock();
      }

      if (receivedBytes === 0) {
        throw new Error("O áudio recebido está vazio.");
      }

      await storeGeneratedMusic({
        orderId,
        userId: user.id,
        taskId: order.kie_task_id,
        fullAudio: Buffer.concat(chunks, receivedBytes),
      });

      const { data: refreshedOrder, error: refreshError } = await adminClient
        .from("orders")
        .select("state, preview_play_count, payment_status")
        .eq("id", orderId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (refreshError || !refreshedOrder) {
        throw new Error("Não foi possível confirmar o estado atualizado.");
      }

      return json({
        state: refreshedOrder.state,
        preview_play_count: refreshedOrder.preview_play_count,
        payment_status: refreshedOrder.payment_status,
      });
    }

    if (
      task.state !== "waiting" &&
      task.state !== "queuing" &&
      task.state !== "generating"
    ) {
      throw new Error("Estado musical não reconhecido.");
    }

    return json(status);
  } catch (error) {
    console.error(
      "[MUSIC_STATUS] Falha na consulta ou processamento:",
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
          }
        : "Erro desconhecido",
    );

    return json(
      { error: "Não foi possível consultar a geração agora." },
      502,
    );
  }
}

async function handleGET(request: NextRequest) {
  const json = (body: unknown, status = 200) =>
    NextResponse.json(body, {
      status,
      headers: { "Cache-Control": "no-store" },
    });

  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return json({ error: "Usuário não autenticado." }, 401);
  }

  const orderId = request.nextUrl.searchParams.get("orderId");
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!orderId || !uuidPattern.test(orderId)) {
    return json({ error: "Solicitação inválida." }, 400);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return json({ error: "Configuração do serviço ausente." }, 500);
  }

  try {
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(authorization.slice(7));

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

    const { data: order, error } = await adminClient
      .from("orders")
      .select("lyrics_1, music_1_storage_path")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .eq("payment_status", "APPROVED")
      .maybeSingle();

    if (error) {
      return json({ error: "Não foi possível consultar a letra." }, 500);
    }

    if (!order) {
      return json(
        { error: "Letra não disponível para esta solicitação." },
        404,
      );
    }

    const asset = request.nextUrl.searchParams.get("asset") ?? "lyrics";

    if (asset === "music") {
      const musicPath = order.music_1_storage_path;

      if (
        typeof musicPath !== "string" ||
        !musicPath.startsWith(`${user.id}/${orderId}/`) ||
        !musicPath.endsWith("/music-1.mp3")
      ) {
        return json(
          { error: "O arquivo da música ainda não está disponível." },
          409,
        );
      }

      const { data: signedMusic, error: signedMusicError } =
        await adminClient.storage
          .from("homenageando-audio")
          .createSignedUrl(musicPath, 300);

      if (signedMusicError || !signedMusic?.signedUrl) {
        return json(
          { error: "Não foi possível disponibilizar a música agora." },
          502,
        );
      }

      return json({ musicUrl: signedMusic.signedUrl });
    }

    if (asset !== "lyrics") {
      return json({ error: "Tipo de arquivo inválido." }, 400);
    }

    if (typeof order.lyrics_1 !== "string" || !order.lyrics_1.trim()) {
      return json({ error: "A letra ainda não está disponível." }, 409);
    }

    return json({ lyrics_1: order.lyrics_1 });
  } catch {
    return json({ error: "Não foi possível consultar a letra agora." }, 500);
  }
}

export async function POST(request: NextRequest) {
  return withAccountOperation(request, handlePOST);
}

export async function GET(request: NextRequest) {
  return withAccountOperation(request, handleGET);
}
