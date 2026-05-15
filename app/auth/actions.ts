"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/auth/login?message=${encodeURIComponent(error.message)}`);
  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const displayName = String(formData.get("displayName") || "").trim();
  const inviteCode = String(formData.get("inviteCode") || "").trim();

  const { data: invite } = await admin
    .from("invites")
    .select("*")
    .eq("code", inviteCode)
    .maybeSingle();

  const inviteIsValid =
    invite &&
    (!invite.expires_at || new Date(invite.expires_at).getTime() > Date.now()) &&
    (!invite.max_uses || invite.used_count < invite.max_uses);

  if (!inviteIsValid) redirect("/auth/login?message=Invite code is invalid or expired.");

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.SITE_URL}/auth/callback`,
      data: { display_name: displayName }
    }
  });

  if (error) redirect(`/auth/login?message=${encodeURIComponent(error.message)}`);

  await admin
    .from("invites")
    .update({ used_count: invite.used_count + 1 })
    .eq("id", invite.id);

  redirect("/auth/login?message=Check your email to confirm your account, then sign in.");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") || "").trim();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.SITE_URL}/auth/reset-password`
  });
  if (error) redirect(`/auth/login?message=${encodeURIComponent(error.message)}`);
  redirect("/auth/login?message=Password reset email sent.");
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const password = String(formData.get("password") || "");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(`/auth/reset-password?message=${encodeURIComponent(error.message)}`);
  redirect("/dashboard");
}
