import { createClient } from "@supabase/supabase-js";
import { storeGeneratedMusic } from "@/lib/store-generated-music";

type Obj = Record<string, unknown>;
const record = (v: unknown): v is Obj =>
  !!v && typeof v === "object" && !Array.isArray(v);

function musicUrl(task: Obj, taskId: string): URL | null {
  let parsed: unknown = task.resultJson;
  if (typeof parsed === "string") parsed = JSON.parse(parsed);
  if (!record(parsed)) throw Error("RESULT_JSON_INVALID");

  const containers: Obj[] = [parsed];
  for (let i = 0; i < containers.length && i < 8; i++) {
    for (const key of ["resultObject", "response", "data"]) {
      const nested = containers[i][key];
      if (record(nested) && !containers.includes(nested)) containers.push(nested);
    }
  }

  const candidates: unknown[] = [];
  for (const data of containers) {
    if (data.code !== undefined && data.code !== 200) throw Error("RESULT_CODE_INVALID");
    for (const field of ["taskId", "task_id"]) {
      if (data[field] !== undefined && data[field] !== taskId) {
        throw Error("RESULT_TASK_MISMATCH");
      }
    }
    for (const field of ["lyricsData", "sunoData", "resultUrls", "data", "tracks"]) {
      const list = data[field];
      if (Array.isArray(list)) candidates.push(...list);
    }
  }

  const hosts: string[] = [];
  for (const item of candidates) {
    const row = record(item) ? item : null;
    const text = typeof item === "string" ? item : row?.audio_url ?? row?.audioUrl;
    if (typeof text !== "string") continue;
    const seconds = row?.duration;
    if (seconds !== undefined && (
      typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 35
    )) continue;
    try {
      const u = new URL(text);
      hosts.push(u.hostname);
      if (
        u.protocol === "https:" &&
        u.hostname === "tempfile.aiquickdraw.com" &&
        !u.port && !u.username && !u.password &&
        (u.pathname.startsWith("/r/") || u.pathname.startsWith("/p/")) &&
        u.pathname.toLowerCase().endsWith(".mp3")
      ) return u;
    } catch { /* Untrusted URL */ }
  }

  console.error("[MUSIC_RECONCILE_FORMAT]", {
    keys: containers.map((x) => Object.keys(x)),
    candidateCount: candidates.length,
    hosts: hosts.slice(0, 6),
  });
  return null;
}

async function download(url: URL): Promise<Buffer> {
  const res = await fetch(url, {
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok || !res.body) throw Error("AUDIO_DOWNLOAD_FAILED");
  const cap = 50 * 1024 * 1024;
  const declared = Number(res.headers.get("content-length") ?? "0");
  if (!Number.isFinite(declared) || declared < 0 || declared > cap) {
    await res.body.cancel();
    throw Error("AUDIO_TOO_LARGE");
  }
  const reader = res.body.getReader();
  const chunks: Buffer[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > cap) throw Error("AUDIO_TOO_LARGE");
      chunks.push(Buffer.from(value));
    }
  } finally {
    try { await reader.cancel(); } catch { /* Already ended */ }
    reader.releaseLock();
  }
  if (!size) throw Error("AUDIO_EMPTY");
  return Buffer.concat(chunks, size);
}

export async function reconcilePendingMusic(): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const kieKey = process.env.KIE_API_KEY;
  if (!supabaseUrl || !key || !kieKey) {
    console.error("[MUSIC_WORKER_CONFIG] Configuração ausente.");
    return;
  }
  const db = createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: orders, error } = await db.from("orders")
    .select("id,user_id,kie_task_id")
    .eq("state", "GERANDO_MUSICA_1")
    .not("kie_task_id", "is", null)
    .order("created_at", { ascending: true })
    .limit(3);
  if (error) {
    console.error("[MUSIC_RECONCILE_DB]", { code: error.code });
    return;
  }
  const results: { id: string; status: string }[] = [];
  for (const order of orders ?? []) {
    if (!order.kie_task_id) continue;
    try {
      const query = new URL("https://api.kie.ai/api/v1/jobs/recordInfo");
      query.searchParams.set("taskId", order.kie_task_id);
      const response = await fetch(query, {
        headers: { Authorization: "Bearer " + kieKey },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      const reply: unknown = await response.json();
      if (!response.ok || !record(reply) || reply.code !== 200 ||
          !record(reply.data)) throw Error("KIE_RESPONSE_INVALID");
      const task = reply.data;
      if (task.taskId !== order.kie_task_id) throw Error("KIE_TASK_MISMATCH");
      if (task.state === "fail") {
        console.error("[MUSIC_RECONCILE_KIE_FAILED]", {
          orderId: order.id,
          failCode: typeof task.failCode === "string" ? task.failCode : null,
        });
        results.push({ id: order.id, status: "kie_failed" });
        continue;
      }
      if (["waiting", "queuing", "generating"].includes(String(task.state))) {
        results.push({ id: order.id, status: "pending" });
        continue;
      }
      if (task.state !== "success") throw Error("KIE_UNKNOWN_STATE");
      const audio = musicUrl(task, order.kie_task_id);
      if (!audio) throw Error("KIE_AUDIO_URL_UNSUPPORTED");
      const full = await download(audio);
      const saved = await storeGeneratedMusic({
        orderId: order.id, userId: order.user_id,
        taskId: order.kie_task_id, fullAudio: full,
      });
      results.push({ id: order.id, status: saved ? "recovered" : "already_processed" });
    } catch (e) {
      const reason = e instanceof Error ? e.message : "UNKNOWN";
      console.error("[MUSIC_RECONCILE_ERROR]", { orderId: order.id, reason });
      results.push({ id: order.id, status: "error" });
    }
  }
  if (results.length) {
    console.log("[MUSIC_WORKER_SUMMARY]", {
      checked: results.length,
      counts: results.reduce<Record<string, number>>((acc, item) => {
        acc[item.status] = (acc[item.status] ?? 0) + 1;
        return acc;
      }, {}),
    });
  }
}
