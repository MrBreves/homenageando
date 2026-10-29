
import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const COOKIE_NAME = "homenageando_private_access";
const COOKIE_PURPOSE = "homenageando-access-v1";

function expectedToken(password: string): string {
  return createHmac("sha256", password)
    .update(COOKIE_PURPOSE)
    .digest("hex");
}

function validToken(token: string | undefined, password: string): boolean {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return false;

  return timingSafeEqual(
    Buffer.from(token, "hex"),
    Buffer.from(expectedToken(password), "hex")
  );
}

function loginScreen(): NextResponse {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Acesso restrito | Homenageando</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: #fffaf2;
      color: #2b1b13;
      font-family: Arial, sans-serif;
    }
    .card {
      width: 100%;
      max-width: 420px;
      padding: 36px;
      border: 1px solid #e5d7c5;
      border-radius: 20px;
      background: #fffdf9;
      text-align: center;
    }
    h1 { margin: 0 0 12px; font-size: 27px; }
    p { color: #756353; line-height: 1.6; }
    input {
      width: 100%;
      padding: 15px;
      margin: 18px 0;
      border: 1px solid #cdbba5;
      border-radius: 10px;
      font-size: 16px;
    }
    button {
      width: 100%;
      padding: 15px;
      border: 1px solid #c99030;
      border-radius: 10px;
      background: #f2c257;
      color: #2b1b13;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <main class="card">
    <h1>Homenageando</h1>
    <p>Ambiente privado de homologação.</p>
    <form method="POST" action="/api/access-gate">
      <input
        type="password"
        name="password"
        placeholder="Senha de acesso"
        autocomplete="current-password"
        required
        autofocus
      >
      <button type="submit">Acessar</button>
    </form>
  </main>
</body>
</html>`;

  return new NextResponse(html, {
    status: 401,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export function proxy(request: NextRequest) {
  const password = process.env.SITE_ACCESS_PASSWORD;

  if (!password) {
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.next();
    }

    return new NextResponse(
      "Acesso privado nao configurado.",
      { status: 503 }
    );
  }

  const path = request.nextUrl.pathname;

  if (
    path === "/api/access-gate" ||
    path === "/auth/callback" ||
    path === "/api/payment/webhook"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (validToken(token, password)) {
    return NextResponse.next();
  }

  if (path.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Acesso privado nao autorizado." },
      { status: 401 }
    );
  }

  return loginScreen();
}

export const config = {
  matcher: [
    "/((?!_next/|images/|favicon.ico|robots.txt|sitemap.xml|.*\\.[a-zA-Z0-9]+$).*)",
  ],
};
