import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.LIVE_RESULTS_API_URL) {
    return NextResponse.json({ imported: 0, message: "LIVE_RESULTS_API_URL is not configured." });
  }

  const response = await fetch(process.env.LIVE_RESULTS_API_URL, {
    headers: process.env.LIVE_RESULTS_API_KEY ? { authorization: `Bearer ${process.env.LIVE_RESULTS_API_KEY}` } : undefined
  });

  if (!response.ok) return NextResponse.json({ error: "Live result provider failed" }, { status: 502 });

  const payload = await response.json();
  const rows = normalizeProviderPayload(payload);
  const admin = createAdminClient();
  let imported = 0;

  for (const row of rows) {
    const { error } = await admin.from("match_results").upsert({
      match_id: row.matchId,
      home_score: row.homeScore,
      away_score: row.awayScore,
      source: "provider",
      status: "pending"
    });
    if (!error) imported += 1;
  }

  return NextResponse.json({ imported });
}

function normalizeProviderPayload(payload: any): Array<{ matchId: string; homeScore: number; awayScore: number }> {
  const rows = Array.isArray(payload?.matches) ? payload.matches : Array.isArray(payload) ? payload : [];
  return rows
    .map((row: any) => ({
      matchId: String(row.id || row.match_id || ""),
      homeScore: Number(row.home_score ?? row.homeScore),
      awayScore: Number(row.away_score ?? row.awayScore)
    }))
    .filter((row: any) => row.matchId && Number.isFinite(row.homeScore) && Number.isFinite(row.awayScore));
}

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return secret && request.headers.get("authorization") === `Bearer ${secret}`;
}
