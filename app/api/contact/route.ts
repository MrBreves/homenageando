import { sendContactEmail } from "../../../lib/contact-email";
import {
  contactEnvironment,
  contactIp,
  consumeContactLimit,
} from "../../../lib/contact-security";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 32_000;

function respond(status: number, message: string, retryAfter?: number) {
  return Response.json(
    { ok: status === 200, message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}),
      },
    }
  );
}

function isSubject(
  value: unknown
): value is "duvida" | "musica" | "pagamento" | "reembolso" | "privacidade" {
  return (
    value === "duvida" ||
    value === "musica" ||
    value === "pagamento" ||
    value === "reembolso" ||
    value === "privacidade"
  );
}

async function readLimitedJson(request: Request): Promise<unknown> {
  if (!request.body) {
    throw new Error("EMPTY_BODY");
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });

  let bytes = 0;
  let text = "";

  try {
    while (true) {
      const result = await reader.read();

      if (result.done) {
        break;
      }

      bytes += result.value.byteLength;

      if (bytes > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new Error("BODY_TOO_LARGE");
      }

      text += decoder.decode(result.value, { stream: true });
    }

    text += decoder.decode();
    return JSON.parse(text);
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request: Request) {
  let environment: ReturnType<typeof contactEnvironment>;

  try {
    environment = contactEnvironment();
  } catch {
    return respond(
      503,
      "O formulário está temporariamente indisponível. Entre em contato pelo e-mail marcio.breves@gmail.com."
    );
  }

  if (request.headers.get("origin") !== environment.origin) {
    return respond(403, "Origem da solicitação não permitida.");
  }

  try {
    const limit = await consumeContactLimit(
      "ip",
      contactIp(request, environment.local),
      environment.hashSecret
    );

    if (!limit.allowed) {
      return respond(
        429,
        "Limite de tentativas atingido. Aguarde 10 minutos antes de tentar novamente.",
        limit.retryAfter
      );
    }
  } catch {
    return respond(
      503,
      "Não foi possível verificar o limite de envios. Tente novamente mais tarde."
    );
  }

  const contentType = request.headers
    .get("content-type")
    ?.split(";")[0]
    .trim()
    .toLowerCase();

  if (contentType !== "application/json") {
    return respond(415, "Formato de mensagem não permitido.");
  }

  let body: unknown;

  try {
    body = await readLimitedJson(request);
  } catch (error) {
    if (error instanceof Error && error.message === "BODY_TOO_LARGE") {
      return respond(413, "A mensagem ultrapassa o tamanho permitido.");
    }

    return respond(400, "Não foi possível ler os dados enviados.");
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return respond(400, "Dados inválidos.");
  }

  const data = body as Record<string, unknown>;

  if (
    typeof data.name !== "string" ||
    typeof data.email !== "string" ||
    typeof data.message !== "string" ||
    !isSubject(data.subject)
  ) {
    return respond(400, "Preencha todos os campos corretamente.");
  }

  const name = data.name.trim();
  const email = data.email.trim();
  const message = data.message.trim();

  if (
    name.length < 2 ||
    name.length > 120 ||
    /[\r\n]/.test(name)
  ) {
    return respond(400, "Informe um nome entre 2 e 120 caracteres.");
  }

  if (
    email.length > 254 ||
    /[\r\n]/.test(email) ||
    !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)
  ) {
    return respond(400, "Informe um e-mail válido.");
  }

  if (message.length < 10 || message.length > 5000) {
    return respond(
      400,
      "A mensagem deve ter entre 10 e 5.000 caracteres."
    );
  }

  const token = data.turnstileToken;

  if (
    typeof token !== "string" ||
    token.trim().length === 0 ||
    token.length > 2048
  ) {
    return respond(
      400,
      "Conclua a verificação de segurança antes de enviar."
    );
  }

  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();

  if (!secret) {
    return respond(
      503,
      "A verificação de segurança está indisponível. Tente novamente mais tarde."
    );
  }

  const verificationController = new AbortController();
  const verificationTimeout = setTimeout(
    () => verificationController.abort(),
    8000
  );

  try {
    const verificationResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          secret,
          response: token,
        }),
        signal: verificationController.signal,
        cache: "no-store",
      }
    );

    if (!verificationResponse.ok) {
      return respond(
        503,
        "A verificação de segurança está indisponível. Tente novamente mais tarde."
      );
    }

    const verification: unknown = await verificationResponse.json();

    if (
      !verification ||
      typeof verification !== "object" ||
      Array.isArray(verification)
    ) {
      return respond(
        503,
        "Não foi possível confirmar a verificação de segurança. Tente novamente."
      );
    }

    const result = verification as Record<string, unknown>;

    const errorCodes = Array.isArray(result["error-codes"])
      ? result["error-codes"]
      : [];

    if (
      errorCodes.includes("missing-input-secret") ||
      errorCodes.includes("invalid-input-secret") ||
      errorCodes.includes("internal-error")
    ) {
      return respond(
        503,
        "A verificação de segurança está indisponível. Tente novamente mais tarde."
      );
    }

    if (
      result.success !== true ||
      result.action !== "contact" ||
      result.hostname !== environment.hostname
    ) {
      return respond(
        403,
        "A verificação de segurança expirou ou não foi aceita. Faça uma nova verificação e tente novamente."
      );
    }
  } catch {
    return respond(
      503,
      "Não foi possível consultar a verificação de segurança. Tente novamente mais tarde."
    );
  } finally {
    clearTimeout(verificationTimeout);
  }

  try {
    for (const [scope, value] of [
      ["email", email.toLowerCase()],
      ["global", environment.origin],
    ] as const) {
      const limit = await consumeContactLimit(
        scope,
        value,
        environment.hashSecret
      );

      if (!limit.allowed) {
        return respond(
          429,
          "Limite de envios atingido. Tente novamente mais tarde.",
          limit.retryAfter
        );
      }
    }
  } catch {
    return respond(
      503,
      "Não foi possível verificar o limite de envios. Tente novamente mais tarde."
    );
  }

  try {
    await sendContactEmail({
      name,
      email,
      subject: data.subject,
      message,
    });

    return respond(
      200,
      "Sua mensagem foi encaminhada ao atendimento. Responderemos pelo e-mail informado."
    );
  } catch {
    return respond(
      502,
      "Não foi possível confirmar o envio. Entre em contato pelo e-mail marcio.breves@gmail.com."
    );
  }
}