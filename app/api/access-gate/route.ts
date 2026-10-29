
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const COOKIE_NAME = "homenageando_private_access";
const COOKIE_PURPOSE = "homenageando-access-v1";

function safePasswordMatch(input: string, expected: string): boolean {
  const inputHash = createHash("sha256").update(input).digest();
  const expectedHash = createHash("sha256").update(expected).digest();

  return timingSafeEqual(inputHash, expectedHash);
}

export async function POST(request: Request) {
  const configuredPassword = process.env.SITE_ACCESS_PASSWORD;

  if (!configuredPassword) {
    return new Response("Protecao nao configurada.", { status: 503 });
  }

  const form = await request.formData();
  const suppliedPassword = form.get("password");

  const password =
    typeof suppliedPassword === "string"
      ? suppliedPassword
      : "";

  if (!safePasswordMatch(password, configuredPassword)) {
    return new Response(
      "Senha incorreta. Volte e tente novamente.",
      {
        status: 401,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const token = createHmac("sha256", configuredPassword)
    .update(COOKIE_PURPOSE)
    .digest("hex");

  const response = NextResponse.redirect(new URL("/", request.url), {
    status: 303,
  });

  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  response.headers.set("Cache-Control", "no-store");

  return response;
}
