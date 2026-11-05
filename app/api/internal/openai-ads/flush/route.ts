import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { flushOpenAIConversions } from "@/lib/openai-conversions-worker.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(given: string | null, expected: string | undefined) {
  if (!expected || !given?.startsWith("Bearer ")) return false;
  const received = given.slice(7);
  const a = createHash("sha256").update(received).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!authorized(request.headers.get("authorization"), process.env.OPENAI_ADS_RETRY_SECRET) && !authorized(request.headers.get("authorization"), process.env.OPENAI_ADS_CRON_SECRET)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const result = await flushOpenAIConversions();
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
