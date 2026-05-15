"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdminEmail, requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

export async function savePrediction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const matchId = String(formData.get("matchId"));
  const homeScore = Number(formData.get("homeScore"));
  const awayScore = Number(formData.get("awayScore"));

  const { error } = await supabase.from("predictions").upsert({
    user_id: user.id,
    match_id: matchId,
    home_score: homeScore,
    away_score: awayScore
  });

  if (error) redirect(`/dashboard?message=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard");
}

export async function saveChampionPick(formData: FormData) {
  const { supabase, user } = await requireUser();
  const teamName = String(formData.get("teamName"));
  const { error } = await supabase.from("champion_picks").upsert({
    user_id: user.id,
    team_name: teamName
  });
  if (error) redirect(`/dashboard?message=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard");
}

export async function updateProfile(formData: FormData) {
  const { supabase, user } = await requireUser();
  const displayName = String(formData.get("displayName") || "").trim();
  const emailNotifications = formData.get("emailNotifications") === "on";
  const reminders = formData.get("reminders") === "on";
  const avatar = formData.get("avatar");

  let avatarUrl: string | undefined;
  if (avatar instanceof File && avatar.size > 0) {
    const ext = avatar.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar.${ext}`;
    const upload = await supabase.storage.from("avatars").upload(path, avatar, { upsert: true });
    if (upload.error) redirect(`/dashboard?message=${encodeURIComponent(upload.error.message)}`);
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    avatarUrl = `${data.publicUrl}?v=${Date.now()}`;
  }

  const updates: Record<string, unknown> = {
    display_name: displayName,
    email_notifications_enabled: emailNotifications,
    prediction_reminders_enabled: reminders
  };
  if (avatarUrl) updates.avatar_url = avatarUrl;

  const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
  if (error) redirect(`/dashboard?message=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard");
}

export async function approveResult(formData: FormData) {
  const { user } = await requireUser();
  if (!isAdminEmail(user.email)) redirect("/dashboard?message=Admin only.");

  const admin = createAdminClient();
  const matchId = String(formData.get("matchId"));
  const homeScore = Number(formData.get("homeScore"));
  const awayScore = Number(formData.get("awayScore"));

  const { data: oldValue } = await admin.from("match_results").select("*").eq("match_id", matchId).maybeSingle();
  const { error } = await admin.from("match_results").upsert({
    match_id: matchId,
    home_score: homeScore,
    away_score: awayScore,
    source: "admin",
    status: "approved",
    approved_by: user.id,
    approved_at: new Date().toISOString()
  });

  if (error) redirect(`/dashboard?message=${encodeURIComponent(error.message)}`);

  await admin.from("admin_audit_log").insert({
    admin_id: user.id,
    action: oldValue ? "update_result" : "approve_result",
    entity_type: "match_result",
    entity_id: matchId,
    old_value: oldValue,
    new_value: { match_id: matchId, home_score: homeScore, away_score: awayScore, status: "approved" }
  });

  await notifyResult(matchId);
  revalidatePath("/dashboard");
}

export async function saveChampionResult(formData: FormData) {
  const { user } = await requireUser();
  if (!isAdminEmail(user.email)) redirect("/dashboard?message=Admin only.");

  const admin = createAdminClient();
  const teamName = String(formData.get("teamName"));
  const { data: oldValue } = await admin.from("contest_settings").select("*").eq("key", "champion").maybeSingle();

  await admin.from("contest_settings").upsert({
    key: "champion",
    value: teamName
  });

  await admin.from("admin_audit_log").insert({
    admin_id: user.id,
    action: "set_champion",
    entity_type: "contest_settings",
    entity_id: "champion",
    old_value: oldValue,
    new_value: { value: teamName }
  });

  revalidatePath("/dashboard");
}

async function notifyResult(matchId: string) {
  const admin = createAdminClient();
  const { data: match } = await admin.from("matches").select("*").eq("id", matchId).single();
  const { data: result } = await admin.from("match_results").select("*").eq("match_id", matchId).single();
  const { data: users } = await admin
    .from("profiles")
    .select("id,email,display_name,email_notifications_enabled")
    .eq("email_notifications_enabled", true);

  if (!match || !result || !users) return;

  for (const profile of users) {
    const insert = await admin.from("notification_log").insert({
      user_id: profile.id,
      kind: "result_approved",
      entity_id: matchId
    });

    if (insert.error) continue;

    await sendEmail({
      to: profile.email,
      subject: `Result approved: ${match.home_team} ${result.home_score}-${result.away_score} ${match.away_team}`,
      html: `<p>${match.home_team} - ${match.away_team} ended ${result.home_score}-${result.away_score}.</p><p>Leaderboard has been updated.</p>`
    });
  }
}
