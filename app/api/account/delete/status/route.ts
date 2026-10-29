
import { contactEnvironment, contactIp, consumeContactLimit } from "@/lib/contact-security";
import { deletionAdmin, deletionControl } from "@/lib/account-deletion.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Apenas o protocolo aleatório: não recebe usuário e não retorna dados pessoais.
export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };
  const reader = request.body?.getReader();

  if (!reader) {
    return Response.json(
      { error: "Protocolo inválido." },
      { status: 400, headers }
    );
  }

  let text = "";
  let size = 0;
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      size += value.byteLength;

      if (size > 128) {
        return Response.json(
          { error: "Protocolo inválido." },
          { status: 413, headers }
        );
      }

      text += decoder.decode(value, { stream: true });
    }

    text += decoder.decode();

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) {
      return Response.json(
        { error: "Protocolo inválido." },
        { status: 400, headers }
      );
    }

    const environment = contactEnvironment();

    const limit = await consumeContactLimit(
      "ip",
      "account-delete-status:" + contactIp(request, environment.local),
      environment.hashSecret
    );

    if (!limit.allowed) {
      return Response.json(
        { error: "Muitas consultas. Aguarde até dez minutos antes de consultar novamente." },
        {
          status: 429,
          headers: {
            ...headers,
            "Retry-After": String(limit.retryAfter),
          },
        }
      );
    }

    const result = await deletionControl(
      deletionAdmin(Date.now() + 8000),
      "status",
      { p_request_id: text }
    );

    return Response.json(result, { headers });
  } catch {
    return Response.json(
      { error: "Não foi possível consultar agora." },
      { status: 503, headers }
    );
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
