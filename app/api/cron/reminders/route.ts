import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { formatFinnishTime } from "@/lib/time";

export async function POST(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const now = Date.now();
  const lower = new Date(now + 55 * 60 * 1000).toISOString();
  const upper = new Date(now + 65 * 60 * 1000).toISOString();

  const { data: matches } = await admin.from("matches").select("*").gte("starts_at", lower).lte("starts_at", upper);
  if (!matches?.length) return NextResponse.json({ sent: 0 });

  let sent = 0;
  const { data: players } = await admin
    .from("contest_players")
    .select("id,email,display_name,access_token,prediction_reminders_enabled")
    .eq("prediction_reminders_enabled", true);

  for (const match of matches) {
    for (const profile of players || []) {
      if (!profile.email) continue;
      const { data: prediction } = await admin
        .from("player_predictions")
        .select("player_id")
        .eq("player_id", profile.id)
        .eq("match_id", match.id)
        .maybeSingle();

      if (prediction) continue;

      const log = await admin.from("player_notification_log").insert({
        player_id: profile.id,
        kind: "prediction_reminder",
        entity_id: match.id
      });

      if (log.error) continue;

      await sendEmail({
        to: profile.email,
        subject: `Reminder: ${match.home_team} vs ${match.away_team} starts in 1 hour`,
        html: `<p>${match.home_team} vs ${match.away_team} starts at ${formatFinnishTime(match.starts_at)}.</p><p>You have not submitted your prediction yet. Missing prediction = 0 points.</p><p><a href="${process.env.SITE_URL}/p/${profile.access_token}">Open your prediction page</a></p>`
      });
      sent += 1;
    }
  }

  return NextResponse.json({ sent });
}

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return secret && request.headers.get("authorization") === `Bearer ${secret}`;
}
