import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getPlayerByToken(token: string) {
  const supabase = createAdminClient();
  const { data: player } = await supabase.from("contest_players").select("*").eq("access_token", token).maybeSingle();
  if (!player) notFound();
  return { supabase, player };
}

export function publicPlayerUrl(token: string) {
  return `/p/${token}`;
}

export function publicAdminUrl(token: string) {
  return `/admin/${token}`;
}
