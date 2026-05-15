import { NextResponse } from "next/server";
import { fetchFootballDataResults } from "@/lib/football-data";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const provider = await fetchFootballDataResults();
  const rows = provider.results;
  const admin = createAdminClient();
  let imported = 0;

  for (const row of rows) {
    const { error } = await admin.from("match_results").upsert({
      match_id: row.matchId,
      home_score: row.homeScore,
      away_score: row.awayScore,
      source: `football-data:${row.providerId}`,
      status: "pending"
    });
    if (!error) imported += 1;
  }

  return NextResponse.json({ imported, matched: rows.length, rateLimit: provider.rateLimit, message: provider.message });
}

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return secret && request.headers.get("authorization") === `Bearer ${secret}`;
}
