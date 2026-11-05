import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { validateOpenAIAdsConnection } from "@/lib/openai-ads-validation.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function tokenMatches(header: string | null, secret: string | undefined) {
  if (!header?.startsWith("Bearer ") || !secret || secret.length < 32) return false;
  const provided = createHash("sha256").update(header.slice(7)).digest();
  const expected = createHash("sha256").update(secret).digest();
  return timingSafeEqual(provided, expected);
}

export async function POST(request: NextRequest) {
  const bearer = request.headers.get("authorization");
  if (
    !tokenMatches(bearer, process.env.OPENAI_ADS_RETRY_SECRET) &&
    !tokenMatches(bearer, process.env.OPENAI_ADS_CRON_SECRET)
  ) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }
  const result = await validateOpenAIAdsConnection();
  console.info("[OpenAI Ads] validate_only result:", result.reason, result.providerStatus ?? "none");
  return NextResponse.json(result, {
    status: result.ok ? 200 : 502,
    headers: { "Cache-Control": "no-store" },
  });
}
