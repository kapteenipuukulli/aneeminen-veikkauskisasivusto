import { NextResponse } from "next/server";
import { contestPlayers } from "@/data/players";
import { matches, teams } from "@/data/world-cup-2026";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const teamRows = teams.map((team) => ({
    name: team.name,
    group_code: team.group,
    country_code: team.code,
    flag: team.flag
  }));
  const matchRows = matches.map((match) => ({
    id: match.id,
    stage: match.stage,
    group_code: match.groupCode,
    home_team: match.home,
    away_team: match.away,
    starts_at: match.startsAtUtc,
    tv: match.tv,
    city: match.city,
    country: match.country
  }));
  const playerRows = contestPlayers.map((player) => ({
    id: player.id,
    initials: player.initials,
    display_name: player.displayName,
    access_token: player.accessToken,
    is_admin: player.isAdmin,
    avatar_url: player.avatarUrl
  }));

  const teamInsert = await admin.from("teams").upsert(teamRows);
  if (teamInsert.error) return NextResponse.json({ error: teamInsert.error.message }, { status: 500 });

  const matchInsert = await admin.from("matches").upsert(matchRows);
  if (matchInsert.error) return NextResponse.json({ error: matchInsert.error.message }, { status: 500 });

  for (const match of matchRows) {
    await admin
      .from("matches")
      .update({ home_team: match.home_team, away_team: match.away_team, stage: match.stage })
      .eq("id", match.id);
  }

  const playerInsert = await admin.from("contest_players").upsert(playerRows);
  if (playerInsert.error) return NextResponse.json({ error: playerInsert.error.message }, { status: 500 });

  if (process.env.INVITE_CODE) {
    await admin.from("invites").upsert({
      code: process.env.INVITE_CODE,
      max_uses: null
    });
  }

  return NextResponse.json({ teams: teamRows.length, matches: matchRows.length, players: playerRows.length });
}

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return secret && request.headers.get("authorization") === `Bearer ${secret}`;
}
