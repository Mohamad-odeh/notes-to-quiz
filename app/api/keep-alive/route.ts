// GET /api/keep-alive - called once a day by GitHub Actions (.github/workflows/keep-alive.yml).
// It runs one tiny database query, because free Supabase projects pause after 7 days without activity.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  // Only the scheduled job knows this secret
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // A tiny query: look for a shared quiz that doesn't exist
  const supabase = await createClient();
  const { error } = await supabase.rpc("get_shared_quiz", {
    p_share_id: "00000000-0000-0000-0000-000000000000",
  });
  if (error) return NextResponse.json({ ok: false }, { status: 500 });

  return NextResponse.json({ ok: true });
}
