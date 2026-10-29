import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function responder(isAdmin: boolean) {
  return NextResponse.json(
    { isAdmin },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const adminUserId = process.env.ADMIN_USER_ID;

  if (!supabaseUrl || !anonKey || !adminUserId) {
    return responder(false);
  }

  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return responder(false);
  }

  const accessToken = authorization.slice(7).trim();

  if (!accessToken || accessToken.length > 8192) {
    return responder(false);
  }

  try {
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const {
      data: { user },
      error,
    } = await authClient.auth.getUser(accessToken);

    if (error || !user) {
      return responder(false);
    }

    return responder(user.id === adminUserId);
  } catch (error) {
    console.error("Falha na verificação administrativa:", error);
    return responder(false);
  }
}
