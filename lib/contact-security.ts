import "server-only";

import { createHmac } from "node:crypto";
import { isIP } from "node:net";

export function contactEnvironment() {
  const runtime =
    process.env.CONTACT_RUNTIME?.trim() ||
    (process.env.NODE_ENV === "development" ? "local" : "");

  const netlify = runtime === "netlify";

  const raw =
    process.env.APP_ORIGIN?.trim() ||
    (process.env.NODE_ENV === "development" && !netlify
      ? "http://localhost:3000"
      : "");

  const url = new URL(raw);

  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  ) {
    throw new Error("CONTACT_ORIGIN_CONFIG");
  }

  const local =
    url.hostname === "localhost" && runtime === "local";

  if (
    local
      ? url.protocol !== "http:"
      : url.protocol !== "https:"
  ) {
    throw new Error("CONTACT_ORIGIN_CONFIG");
  }

  if (!local && !netlify) {
    throw new Error("CONTACT_HOSTING_ADAPTER_REQUIRED");
  }

  const hashSecret =
    process.env.CONTACT_RATE_LIMIT_SECRET?.trim();

  if (!hashSecret || hashSecret.length < 32) {
    throw new Error("CONTACT_RATE_LIMIT_CONFIG");
  }

  return {
    origin: url.origin,
    hostname: url.hostname,
    local,
    hashSecret,
  };
}

export function contactIp(
  request: Request,
  local: boolean
): string {
  if (local) {
    return "local-development";
  }

  // Na Netlify, utiliza apenas o header fornecido pela hospedagem.
  const ip = request.headers
    .get("x-nf-client-connection-ip")
    ?.trim();

  const family = ip ? isIP(ip) : 0;

  if (!ip || !family) {
    throw new Error("CONTACT_CLIENT_IP_UNAVAILABLE");
  }

  return family === 6
    ? new URL(`http://[${ip}]/`).hostname
    : ip;
}

export async function consumeContactLimit(
  scope: "ip" | "email" | "global",
  value: string,
  hashSecret: string
): Promise<{
  allowed: boolean;
  retryAfter: number;
}> {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!rawUrl || !key) {
    throw new Error("CONTACT_DATABASE_CONFIG");
  }

  const url = new URL(rawUrl);

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password
  ) {
    throw new Error("CONTACT_DATABASE_CONFIG");
  }

  const hash = createHmac("sha256", hashSecret)
    .update(`${scope}:${value}`)
    .digest("hex");

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    4000
  );

  try {
    const response = await fetch(
      new URL(
        "/rest/v1/rpc/consume_contact_rate_limit",
        url
      ),
      {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_scope: scope,
          p_key_hash: hash,
        }),
        signal: controller.signal,
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error("CONTACT_DATABASE_UNAVAILABLE");
    }

    const data: unknown = await response.json();

    if (!Array.isArray(data) || data.length !== 1) {
      throw new Error("CONTACT_DATABASE_RESPONSE");
    }

    const row: unknown = data[0];

    if (
      !row ||
      typeof row !== "object" ||
      !("allowed" in row) ||
      !("retry_after" in row) ||
      typeof row.allowed !== "boolean" ||
      typeof row.retry_after !== "number" ||
      !Number.isInteger(row.retry_after) ||
      row.retry_after < 0 ||
      row.retry_after > 3600
    ) {
      throw new Error("CONTACT_DATABASE_RESPONSE");
    }

    return {
      allowed: row.allowed,
      retryAfter: row.retry_after,
    };
  } finally {
    clearTimeout(timeout);
  }
}