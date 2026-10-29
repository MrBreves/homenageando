
import { contactEnvironment, contactIp, consumeContactLimit } from "@/lib/contact-security";
import { deletionAdmin, deletionControl, processDeletion } from "@/lib/account-deletion.mjs";
import { sendAccountDeletionEmail } from "@/lib/account-deletion-email";
import { createClient } from "@supabase/supabase-js";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function erro(mensagem: string, status: number) {
  return Response.json(
    { ok: false, error: mensagem },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey || !serviceKey) {
    return erro("Serviço de exclusão não configurado.", 503);
  }

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  let origemAutorizada = false;

  try {
    if (origin && host) {
      const urlOrigem = new URL(origin);

      const producao =
        urlOrigem.origin === "https://homenageando.com.br" &&
        urlOrigem.host === host;

      const desenvolvimento =
        process.env.NODE_ENV !== "production" &&
        urlOrigem.protocol === "http:" &&
        urlOrigem.host === host &&
        (
          urlOrigem.hostname === "localhost" ||
          urlOrigem.hostname === "127.0.0.1" ||
          /^192\.168\.\d{1,3}\.\d{1,3}$/.test(
            urlOrigem.hostname
          )
        );

      origemAutorizada = producao || desenvolvimento;
    }
  } catch {
    origemAutorizada = false;
  }

  if (!origemAutorizada) {
    return erro("Origem não autorizada.", 403);
  }

  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return erro("Autenticação obrigatória.", 401);
  }

  try {
    const environment = contactEnvironment();

    const limit = await consumeContactLimit(
      "ip",
      "account-delete:" + contactIp(request, environment.local),
      environment.hashSecret
    );

    if (!limit.allowed) {
      return Response.json(
        {
          ok: false,
          error: "Muitas tentativas. Aguarde antes de tentar novamente.",
        },
        {
          status: 429,
          headers: {
            "Cache-Control": "no-store",
            "Retry-After": String(limit.retryAfter),
          },
        }
      );
    }
  } catch {
    return erro(
      "Proteção de acesso indisponível. Tente novamente mais tarde.",
      503
    );
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    return erro("Sessão inválida.", 401);
  }

  try {
    if (!request.body) {
      return erro("Solicitação inválida.", 400);
    }

    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        size += value.byteLength;

        if (size > 1024) {
          return erro("Solicitação muito grande.", 413);
        }

        chunks.push(value);
      }
    } finally {
      await reader.cancel().catch(() => undefined);
      reader.releaseLock();
    }

    const bytes = new Uint8Array(size);
    let offset = 0;

    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }

    const corpo: unknown = JSON.parse(
      new TextDecoder().decode(bytes)
    );

    if (
      !corpo ||
      typeof corpo !== "object" ||
      Array.isArray(corpo) ||
      !("confirmacao" in corpo) ||
      corpo.confirmacao !== "EXCLUIR"
    ) {
      return erro("Confirmação inválida.", 400);
    }
  } catch {
    return erro("Solicitação inválida.", 400);
  }

  const autenticacao = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: usuario, error: erroAuth } =
    await autenticacao.auth.getUser(token);

  if (erroAuth || !usuario.user) {
    return erro("Sessão inválida ou expirada.", 401);
  }

  const userId = usuario.user.id;

  const deadline = Date.now() + 22000;
  const admin = deletionAdmin(deadline);

  try {
    const result = await deletionControl(
      admin,
      "request",
      { p_user_id: userId }
    );

    const completed = result.throttled
      ? false
      : await processDeletion(
          admin,
          result.request_id,
          15000
        );

    const email = usuario.user.email?.trim() ?? "";

    const emailSent = email
      ? await sendAccountDeletionEmail({
          email,
          protocol: result.request_id,
        })
      : false;

    return Response.json(
      {
        ok: true,
        pending: !completed,
        requestId: result.request_id,
        statusUrl:
          "/exclusao-de-dados/status#" + result.request_id,
        emailSent,
        message: completed
          ? "Conta excluída com sucesso."
          : "Solicitação registrada. O acesso aos pedidos foi bloqueado enquanto concluímos a exclusão. Guarde o protocolo: " + result.request_id,
      },
      {
        status: completed ? 200 : 202,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );

  } catch {
    return erro(
      "Não foi possível confirmar o processamento. Tente novamente; a solicitação não será duplicada.",
      503
    );
  }
}
