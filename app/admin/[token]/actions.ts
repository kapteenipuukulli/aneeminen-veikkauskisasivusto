"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { bracketMatchById } from "@/data/bracket";
import { getPlayerByToken } from "@/lib/link-mode";
import { sendEmail } from "@/lib/email";

export async function approveLinkedResult(formData: FormData) {
  const token = String(formData.get("token"));
  const matchId = String(formData.get("matchId"));
  const homeScore = Number(formData.get("homeScore"));
  const awayScore = Number(formData.get("awayScore"));
  const { supabase, player } = await getPlayerByToken(token);
  if (!player.is_admin) redirect(`/p/${token}?message=Admin only.`);

  const { data: oldValue } = await supabase.from("match_results").select("*").eq("match_id", matchId).maybeSingle();
  const { error } = await supabase.from("match_results").upsert({
    match_id: matchId,
    home_score: homeScore,
    away_score: awayScore,
    source: "admin-link",
    status: "approved",
    approved_at: new Date().toISOString()
  });
  if (error) redirect(`/admin/${token}?message=${encodeURIComponent(error.message)}`);

  await supabase.from("admin_audit_log").insert({
    action: oldValue ? "update_result_link_mode" : "approve_result_link_mode",
    entity_type: "match_result",
    entity_id: matchId,
    old_value: oldValue,
    new_value: { match_id: matchId, home_score: homeScore, away_score: awayScore, status: "approved" }
  });

  await advanceBracketWinner({
    supabase,
    matchId,
    homeScore,
    awayScore,
    updatedBy: player.id
  });

  await notifyLinkedPlayers(token, matchId);
  revalidatePath(`/admin/${token}`);
}

export async function saveLinkedChampionResult(formData: FormData) {
  const token = String(formData.get("token"));
  const teamName = String(formData.get("teamName"));
  const { supabase, player } = await getPlayerByToken(token);
  if (!player.is_admin) redirect(`/p/${token}?message=Admin only.`);

  const { data: oldValue } = await supabase.from("contest_settings").select("*").eq("key", "champion").maybeSingle();
  const { error } = await supabase.from("contest_settings").upsert({
    key: "champion",
    value: teamName
  });
  if (error) redirect(`/admin/${token}?message=${encodeURIComponent(error.message)}`);

  await supabase.from("admin_audit_log").insert({
    action: "set_champion_link_mode",
    entity_type: "contest_settings",
    entity_id: "champion",
    old_value: oldValue,
    new_value: { value: teamName }
  });

  revalidatePath(`/admin/${token}`);
}

export async function resetLinkedContest(formData: FormData) {
  const token = String(formData.get("token"));
  const mode = String(formData.get("mode"));
  const confirmation = String(formData.get("confirmation") || "").trim();
  const { supabase, player } = await getPlayerByToken(token);
  if (!player.is_admin) redirect(`/p/${token}?message=Admin only.`);
  if (confirmation !== "RESET") {
    redirect(`/admin/${token}?message=Type RESET to confirm.`);
  }

  if (mode === "all") {
    await supabase.from("player_predictions").delete().neq("player_id", "__never__");
    await supabase.from("player_champion_picks").delete().neq("player_id", "__never__");
  }

  await supabase.from("match_results").delete().neq("match_id", "__never__");
  await supabase.from("player_notification_log").delete().neq("entity_id", "__never__");
  await supabase.from("notification_log").delete().neq("entity_id", "__never__");
  await supabase.from("contest_settings").delete().eq("key", "champion");
  await supabase.from("admin_audit_log").insert({
    action: mode === "all" ? "reset_predictions_and_results_link_mode" : "reset_results_link_mode",
    entity_type: "contest",
    entity_id: "world-cup-2026",
    old_value: null,
    new_value: { mode }
  });

  revalidatePath(`/admin/${token}`);
  redirect(`/admin/${token}?message=${mode === "all" ? "Predictions and results reset." : "Results reset."}`);
}

export async function saveBracketSlot(formData: FormData) {
  const token = String(formData.get("token"));
  const slotCode = String(formData.get("slotCode"));
  const teamName = String(formData.get("teamName"));
  const { supabase, player } = await getPlayerByToken(token);
  if (!player.is_admin) redirect(`/p/${token}?message=Admin only.`);

  if (!teamName) {
    await supabase.from("bracket_slots").delete().eq("slot_code", slotCode);
  } else {
    const { error } = await supabase.from("bracket_slots").upsert({
      slot_code: slotCode,
      team_name: teamName,
      source: "admin",
      updated_by: player.id
    });
    if (error) redirect(`/admin/${token}?message=${encodeURIComponent(error.message)}`);
  }

  await supabase.from("admin_audit_log").insert({
    action: "set_bracket_slot",
    entity_type: "bracket_slot",
    entity_id: slotCode,
    new_value: { slot_code: slotCode, team_name: teamName || null }
  });

  revalidatePath(`/admin/${token}`);
}

async function advanceBracketWinner({
  supabase,
  matchId,
  homeScore,
  awayScore,
  updatedBy
}: {
  supabase: SupabaseClient;
  matchId: string;
  homeScore: number;
  awayScore: number;
  updatedBy: string;
}) {
  const bracket = bracketMatchById.get(matchId);
  if (!bracket || homeScore === awayScore) return;

  const { data: existingSlots } = await supabase
    .from("bracket_slots")
    .select("*")
    .in("slot_code", [bracket.homeSlot, bracket.awaySlot]);

  const slotMap = new Map((existingSlots || []).map((slot: any) => [slot.slot_code, slot.team_name]));
  const homeTeam = slotMap.get(bracket.homeSlot);
  const awayTeam = slotMap.get(bracket.awaySlot);
  if (!homeTeam || !awayTeam) return;

  const winner = homeScore > awayScore ? homeTeam : awayTeam;
  const loser = homeScore > awayScore ? awayTeam : homeTeam;

  if (bracket.winnerSlot) {
    await supabase.from("bracket_slots").upsert({
      slot_code: bracket.winnerSlot,
      team_name: winner,
      source: "result",
      updated_by: updatedBy
    });
  }

  if (bracket.loserSlot) {
    await supabase.from("bracket_slots").upsert({
      slot_code: bracket.loserSlot,
      team_name: loser,
      source: "result",
      updated_by: updatedBy
    });
  }
}

async function notifyLinkedPlayers(token: string, matchId: string) {
  const { supabase } = await getPlayerByToken(token);
  const { data: match } = await supabase.from("matches").select("*").eq("id", matchId).single();
  const { data: result } = await supabase.from("match_results").select("*").eq("match_id", matchId).single();
  const { data: players } = await supabase
    .from("contest_players")
    .select("*")
    .eq("email_notifications_enabled", true)
    .not("email", "is", null);

  if (!match || !result || !players) return;

  for (const target of players) {
    const log = await supabase.from("player_notification_log").insert({
      player_id: target.id,
      kind: "result_approved",
      entity_id: matchId
    });
    if (log.error) continue;

    await sendEmail({
      to: target.email,
      subject: `Result approved: ${match.home_team} ${result.home_score}-${result.away_score} ${match.away_team}`,
      html: `<p>${match.home_team} - ${match.away_team} ended ${result.home_score}-${result.away_score}.</p><p>Leaderboard has been updated.</p>`
    });
  }
}
