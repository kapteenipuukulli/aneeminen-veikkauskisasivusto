"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPlayerByToken } from "@/lib/link-mode";

export async function saveLinkedPrediction(formData: FormData) {
  const token = String(formData.get("token"));
  const matchId = String(formData.get("matchId"));
  const homeScore = Number(formData.get("homeScore"));
  const awayScore = Number(formData.get("awayScore"));
  const { supabase, player } = await getPlayerByToken(token);

  const { data: match } = await supabase.from("matches").select("starts_at").eq("id", matchId).single();
  if (!match || new Date(match.starts_at).getTime() <= Date.now()) {
    redirect(`/p/${token}?message=This match is already locked.`);
  }

  const { error } = await supabase.from("player_predictions").upsert({
    player_id: player.id,
    match_id: matchId,
    home_score: homeScore,
    away_score: awayScore
  });

  if (error) redirect(`/p/${token}?message=${encodeURIComponent(error.message)}`);
  revalidatePath(`/p/${token}`);
}

export async function saveLinkedChampionPick(formData: FormData) {
  const token = String(formData.get("token"));
  const teamName = String(formData.get("teamName"));
  const { supabase, player } = await getPlayerByToken(token);

  const { data: firstMatch } = await supabase.from("matches").select("starts_at").order("starts_at").limit(1).single();
  if (!firstMatch || new Date(firstMatch.starts_at).getTime() <= Date.now()) {
    redirect(`/p/${token}?message=Champion pick is locked.`);
  }

  const { error } = await supabase.from("player_champion_picks").upsert({
    player_id: player.id,
    team_name: teamName
  });

  if (error) redirect(`/p/${token}?message=${encodeURIComponent(error.message)}`);
  revalidatePath(`/p/${token}`);
}

export async function updateLinkedSettings(formData: FormData) {
  const token = String(formData.get("token"));
  const email = String(formData.get("email") || "").trim() || null;
  const emailNotifications = formData.get("emailNotifications") === "on";
  const reminders = formData.get("reminders") === "on";
  const { supabase, player } = await getPlayerByToken(token);

  const { error } = await supabase
    .from("contest_players")
    .update({
      email,
      email_notifications_enabled: emailNotifications,
      prediction_reminders_enabled: reminders
    })
    .eq("id", player.id);

  if (error) redirect(`/p/${token}?message=${encodeURIComponent(error.message)}`);
  revalidatePath(`/p/${token}`);
}
